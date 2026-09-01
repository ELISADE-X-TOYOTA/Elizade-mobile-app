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
/** Last time the app was demonstrably in use, for session expiry. */
const ACTIVITY_KEY = 'elizade_last_active_at';
/** Whether the credentials above were written behind the device gate. */
const PROTECTED_KEY = 'elizade_tokens_protected';
const useSecure = Platform.OS !== 'web';

let cached: string | null | undefined;
let cachedRefresh: string | null | undefined;

/**
 * Are the tokens stored behind the hardware gate?
 *
 * Read once and held, because every read of the credentials consults it and
 * hitting storage for a boolean on each API call is wasteful.
 */
let protectedMode: boolean | undefined;

/**
 * True once a hardware-gated read has succeeded this launch.
 *
 * The app-lock overlay checks this so a customer is not asked for the same
 * fingerprint twice at launch — once by the keystore unsealing the token, then
 * again by our own prompt half a second later.
 */
let hardwareUnlockedThisLaunch = false;

export function wasHardwareUnlockedThisLaunch(): boolean {
  return hardwareUnlockedThisLaunch;
}

/** Cleared on lock so the next unlock genuinely re-authenticates. */
export function resetHardwareUnlock(): void {
  hardwareUnlockedThisLaunch = false;
}

export async function isProtectedMode(): Promise<boolean> {
  if (protectedMode !== undefined) return protectedMode;
  if (!useSecure) return (protectedMode = false);
  try {
    protectedMode = (await SecureStore.getItemAsync(PROTECTED_KEY)) === '1';
  } catch {
    protectedMode = false;
  }
  return protectedMode;
}

/** Storage that never carries the biometric requirement (flags, timestamps). */
async function readPlain(key: string): Promise<string | null> {
  if (!useSecure) return AsyncStorage.getItem(key);
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writePlain(key: string, value: string | null): Promise<void> {
  if (!useSecure) {
    if (value) await AsyncStorage.setItem(key, value);
    else await AsyncStorage.removeItem(key);
    return;
  }
  try {
    if (value) {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    /* non-credential data — losing it must never break the boot path */
  }
}

async function readRaw(key: string, prompt?: string): Promise<string | null> {
  if (!useSecure) return AsyncStorage.getItem(key);
  const gated = await isProtectedMode();
  try {
    const value = await SecureStore.getItemAsync(
      key,
      gated
        ? { requireAuthentication: true, authenticationPrompt: prompt ?? 'Unlock Elizade Connect' }
        : undefined,
    );
    if (gated && value !== null) hardwareUnlockedThisLaunch = true;
    return value;
  } catch {
    /*
      Two very different causes, one safe response.

      Either the customer dismissed the biometric prompt, or the key was
      invalidated because the device's enrolled biometrics changed — Android
      destroys keys bound to a biometric set when that set changes, which is the
      behaviour that makes this storage worth having.

      Both mean "no usable credential right now". Returning null puts them on the
      login screen; it never silently downgrades to an unprotected read.
    */
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
    const gated = await isProtectedMode();
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      ...(gated ? { requireAuthentication: true } : {}),
    });
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

/**
 * Move the stored credentials in or out of the hardware gate.
 *
 * The tokens have to be re-written: the requirement is a property of the
 * keystore entry, not a runtime check, so flipping a flag without rewriting
 * would leave a "protected" account whose token still reads without a prompt.
 *
 * Returns false and changes NOTHING if the rewrite fails — better to leave the
 * customer signed in unprotected, and tell them, than to half-apply this and
 * strand them behind a gate their device cannot open.
 */
export async function setHardwareProtection(enabled: boolean): Promise<boolean> {
  if (!useSecure) return false;
  const token = await getToken();
  const refresh = await getRefreshToken();
  const previous = await isProtectedMode();
  if (previous === enabled) return true;

  try {
    protectedMode = enabled;
    await writePlain(PROTECTED_KEY, enabled ? '1' : null);
    if (token) await writeRaw(TOKEN_KEY, token);
    if (refresh) await writeRaw(REFRESH_KEY, refresh);
    return true;
  } catch {
    protectedMode = previous;
    await writePlain(PROTECTED_KEY, previous ? '1' : null);
    try {
      if (token) await writeRaw(TOKEN_KEY, token);
      if (refresh) await writeRaw(REFRESH_KEY, refresh);
    } catch {
      /* already reported via the false below */
    }
    return false;
  }
}

/** Stamp "the app was used just now", for the session-expiry clock. */
export async function touchActivity(at: number = Date.now()): Promise<void> {
  await writePlain(ACTIVITY_KEY, String(at));
}

/** Null when no build has recorded activity yet — deliberately NOT an expiry. */
export async function readLastActive(): Promise<number | null> {
  const raw = await readPlain(ACTIVITY_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
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
  // The activity stamp and the gate flag go too. Leaving the stamp behind would
  // expire the NEXT customer to sign in on this handset against the last one's
  // idle clock; leaving the flag would demand a fingerprint for a token that no
  // longer exists.
  await Promise.all([writePlain(ACTIVITY_KEY, null), writePlain(PROTECTED_KEY, null)]);
  protectedMode = false;
  hardwareUnlockedThisLaunch = false;
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
/**
 * The signed-in profile, cached so a returning customer sees their own details
 * on the first frame instead of a spinner.
 *
 * THE WHOLE PROFILE, not a subset. It used to hold five fields, and
 * `restoreSession` filled the rest by spreading MOCK_USER over it — so a real
 * customer was shown the demo user's phone number, city and ROLE until the
 * revalidation landed. A cache that has to be padded with fabricated data is
 * the wrong shape.
 *
 * Safe to widen: this goes through `writeRaw`, which is SecureStore (the
 * platform keystore) on device — the same encrypted store as the tokens, not
 * plaintext AsyncStorage.
 */
export interface CachedUser {
  id: string;
  firstName: string;
  lastName: string;
  otherName?: string | null;
  email: string;
  phone: string;
  city: string;
  avatar?: string | null;
  role: 'customer' | 'staff' | 'admin';
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
