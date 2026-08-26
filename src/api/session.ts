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
const REFRESH_KEY = 'elizade_refresh_token';
const USER_KEY = 'elizade_cached_user';
const useSecure = Platform.OS !== 'web';

let cached: string | null | undefined;
let cachedRefresh: string | null | undefined;

async function readRaw(key: string): Promise<string | null> {
  if (!useSecure) return AsyncStorage.getItem(key);
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    // KeyStore can throw if the device credential changed — treat as logged out.
    return null;
  }
}

async function writeRaw(key: string, value: string | null): Promise<void> {
  if (!useSecure) {
    if (value) await AsyncStorage.setItem(key, value);
    else await AsyncStorage.removeItem(key);
    return;
  }
  if (value) {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export async function getToken(): Promise<string | null> {
  if (cached !== undefined) return cached;
  cached = await readRaw(TOKEN_KEY);
  return cached;
}

/**
 * The refresh token — a standing grant, so it lives in the same secure store
 * as the access token and is never written to AsyncStorage on native.
 */
export async function getRefreshToken(): Promise<string | null> {
  if (cachedRefresh !== undefined) return cachedRefresh;
  cachedRefresh = await readRaw(REFRESH_KEY);
  return cachedRefresh;
}

export async function setRefreshToken(token: string | null): Promise<void> {
  cachedRefresh = token;
  try {
    await writeRaw(REFRESH_KEY, token);
  } catch {
    cachedRefresh = null;
  }
}

/**
 * Ends the session completely.
 *
 * Both credentials go together — always. Clearing one and leaving the other
 * is how you get a client that believes it is signed in and can never prove
 * it, which is precisely the state that produced the reported "sudden logout".
 */
export async function clearSession(): Promise<void> {
  await Promise.all([setToken(null), setRefreshToken(null), cacheUser(null)]);
}

export async function setToken(token: string | null): Promise<void> {
  cached = token;
  try {
    await writeRaw(TOKEN_KEY, token);
  } catch {
    // Never surface storage internals; a failed write means "not authenticated".
    cached = null;
  }
}

/*
  Cached profile.

  The store deliberately keeps `currentUser` OUT of AsyncStorage because it
  holds PII and AsyncStorage is plaintext. But excluding it entirely meant
  nothing survived a restart, so every cold start rendered the placeholder
  MOCK_USER until a network round-trip finished — and looked, to the customer,
  exactly like being signed out.

  So it is cached HERE instead, in the same encrypted store as the tokens.
  Only the fields the shell needs to render are kept: enough to paint a
  correct header offline, not a full profile mirror.
*/
export interface CachedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string | null;
}

export async function cacheUser(user: CachedUser | null): Promise<void> {
  try {
    await writeRaw(USER_KEY, user ? JSON.stringify(user) : null);
  } catch {
    /* the cache is an optimisation — losing it costs a round-trip, nothing more */
  }
}

export async function readCachedUser(): Promise<CachedUser | null> {
  try {
    const raw = await readRaw(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedUser;
    // A shape change between builds must not crash the boot path.
    return parsed && typeof parsed.id === 'string' ? parsed : null;
  } catch {
    return null;
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
