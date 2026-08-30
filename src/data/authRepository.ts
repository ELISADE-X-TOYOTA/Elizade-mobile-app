import { unregisterFromPush } from './pushRepository';
import * as authApi from '../api/auth';
import { cacheUser, clearSession, getToken, readCachedUser, setToken } from '../api/session';
import { useStore } from '../store/useStore';
import { APP } from '../constants/app';
import { UserProfile } from '../domain/types';
import { MOCK_USER } from './mock';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The only token the offline demo accepts as a session.
 *
 * Named rather than inlined so `verifyOtp` and `restoreSession` cannot drift:
 * if they disagree, either the demo stops working or any leftover token logs
 * someone straight in.
 */
const MOCK_SESSION_TOKEN = 'mock-session-token';

/**
 * The whole profile, cached verbatim.
 *
 * Previously only five fields were stored and `restoreSession` padded the rest
 * from MOCK_USER, which meant a returning customer was shown the demo user's
 * phone, city and role as if they were their own.
 */
function toCache(user: UserProfile) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    otherName: user.otherName ?? null,
    email: user.email,
    phone: user.phone,
    city: user.city,
    avatar: user.avatar ?? null,
    role: user.role,
  };
}


/** Request a one-time code, delivered to the email address. */
export async function requestOtp(body: authApi.OtpRequestBody): Promise<void> {
  if (APP.useMock) {
    await delay(700);
    return;
  }
  await authApi.requestOtp(body);
}

/** Verify the code and return the signed-in user (token persisted internally). */
export async function verifyOtp(params: {
  email: string;
  code: string;
  /** Locally-collected details, used only to shape the mock user. */
  profile?: Partial<UserProfile>;
}): Promise<UserProfile> {
  if (APP.useMock) {
    await delay(700);
    await setToken(MOCK_SESSION_TOKEN);
    return {
      ...MOCK_USER,
      ...params.profile,
      email: params.email || params.profile?.email || MOCK_USER.email,
    };
  }
  const res = await authApi.verifyOtp({ email: params.email, code: params.code });
  // Seed the cache now so the NEXT cold start renders signed-in immediately.
  await cacheUser(toCache(res.user));
  return res.user;
}

export interface EmailCheck {
  available: boolean;
  reason?: string;
}

/**
 * Is this email free to register? Side-effect free (no code dispatched).
 *
 * A network/server failure resolves as `available: true` rather than throwing:
 * this is a convenience pre-check, and blocking signup because the check
 * itself failed would be worse than letting the real `409` catch it later.
 */
export async function checkEmailAvailable(email: string): Promise<EmailCheck> {
  if (APP.useMock) {
    await delay(400);
    const taken = email.trim().toLowerCase() === MOCK_USER.email.toLowerCase();
    return taken
      ? { available: false, reason: 'Account already exists.' }
      : { available: true };
  }
  try {
    const res = await authApi.checkEmailAvailable(email);
    return { available: res.available, reason: res.reason ?? undefined };
  } catch {
    return { available: true };
  }
}

// Drops this device's push token so a shared handset stops delivering the
// previous customer's updates to whoever signs in next.
export async function logout(): Promise<void> {
  // Before dropping the token — the unregister call needs to be authenticated.
  await unregisterFromPush();
  if (APP.useMock) {
    await clearSession();
    return;
  }
  // Revokes the refresh-token family server-side, then clears both credentials.
  await authApi.revokeSession();
}

/**
 * Rebuilds the signed-in session on app start.
 *
 * WHY THIS DID NOT EXIST BEFORE — and why the app appeared to log people out:
 * the splash screen routed to onboarding unconditionally. A valid token sat in
 * SecureStore, `/auth/me` was written but never called from anywhere, and
 * `currentUser` was never repopulated. Every cold start looked like a logout,
 * because functionally it was one.
 *
 * Two phases, so the UI does not wait on the network:
 *   1. The cached profile is returned immediately — the app renders signed-in
 *      on the first frame, offline included.
 *   2. `/auth/me` is revalidated in the background. A 401 there triggers the
 *      silent refresh in `apiFetch`; only if that also fails does the session
 *      actually end.
 *
 * A network failure NEVER signs anyone out. Being on a train is not a
 * credential problem.
 */
export async function restoreSession(): Promise<UserProfile | null> {
  if (APP.useMock) {
    /*
      Only a token this build actually minted counts.

      `useMock` defaults to `__DEV__`, so any development build took ANY string
      sitting in SecureStore as proof of a session and went straight to the
      home tab — including a real access token left behind by a previous
      non-mock run, and including one belonging to a different account. That is
      the auto-login: no credentials entered, no code verified.

      Checking for the sentinel that `verifyOtp` writes in mock mode keeps the
      offline demo working while making a stale or foreign token worthless.
    */
    const token = await getToken();
    return token === MOCK_SESSION_TOKEN ? MOCK_USER : null;
  }

  const token = await getToken();
  if (!token) return null;

  const cached = await readCachedUser();

  // Revalidate. Awaited only when there is no cache to fall back on — with a
  // cache we can return instantly and let this settle behind the first frame.
  const revalidate = authApi
    .fetchCurrentUser()
    .then(async (user) => {
      await cacheUser(toCache(user));
      return user;
    })
    .catch(() => null);

  if (cached) {
    // Fire and forget; the store is updated when it lands.
    void revalidate.then((fresh) => {
      if (fresh) useStore.getState().setCurrentUser(fresh);
    });
    // The cached profile as-is. Spreading MOCK_USER over it here is what put
    // the demo user's phone, city and role in front of real customers.
    return {
      id: cached.id,
      firstName: cached.firstName,
      lastName: cached.lastName,
      otherName: cached.otherName ?? null,
      email: cached.email,
      phone: cached.phone,
      city: cached.city,
      avatar: cached.avatar ?? undefined,
      role: cached.role,
    };
  }

  // No cache: this is the one path that must wait, because there is nothing
  // to show until it answers.
  return await revalidate;
}
