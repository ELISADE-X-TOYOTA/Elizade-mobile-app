import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Auth-token storage.
 *
 * SECURITY: the bearer token is a credential, so it lives in the platform
 * secure enclave — iOS Keychain / Android EncryptedSharedPreferences (KeyStore)
 * — via expo-secure-store, never in AsyncStorage (plaintext on a rooted or
 * jailbroken device, and swept into some device backups).
 *
 * Web has no SecureStore implementation, so there we fall back to AsyncStorage
 * (the web build is dev-only and browsers sandbox storage per origin).
 */
const TOKEN_KEY = 'elizade_access_token';
const useSecure = Platform.OS !== 'web';

let cached: string | null | undefined;

async function readRaw(): Promise<string | null> {
  if (!useSecure) return AsyncStorage.getItem(TOKEN_KEY);
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // KeyStore can throw if the device credential changed — treat as logged out.
    return null;
  }
}

export async function getToken(): Promise<string | null> {
  if (cached !== undefined) return cached;
  cached = await readRaw();
  return cached;
}

export async function setToken(token: string | null): Promise<void> {
  cached = token;
  try {
    if (!useSecure) {
      if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
      else await AsyncStorage.removeItem(TOKEN_KEY);
      return;
    }
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch {
    // Never surface storage internals; a failed write means "not authenticated".
    cached = null;
  }
}

/** Moves a token written by an older build out of plaintext AsyncStorage. */
export async function migrateLegacyToken(): Promise<void> {
  if (!useSecure) return;
  try {
    const legacy = await AsyncStorage.getItem(TOKEN_KEY);
    if (legacy) {
      await setToken(legacy);
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    /* best-effort migration */
  }
}
