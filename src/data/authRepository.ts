import { unregisterFromPush } from './pushRepository';
import * as authApi from '../api/auth';
import { cacheUser, clearSession, getToken, readCachedUser, setToken } from '../api/session';
import { useStore } from '../store/useStore';
import { APP } from '../constants/app';
import { UserProfile } from '../domain/types';
import { MOCK_USER } from './mock';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
    await setToken('mock-token');
    return {
      ...MOCK_USER,
      ...params.profile,
      email: params.email || params.profile?.email || MOCK_USER.email,
    };
  }
  const res = await authApi.verifyOtp({ email: params.email, code: params.code });
  // Seed the cache now so the NEXT cold start renders signed-in immediately.
  await cacheUser({
    id: res.user.id,
    firstName: res.user.firstName,
    lastName: res.user.lastName,
    email: res.user.email,
    avatar: res.user.avatar ?? null,
  });
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
    const token = await getToken();
    return token ? MOCK_USER : null;
  }

  const token = await getToken();
  if (!token) return null;

  const cached = await readCachedUser();

  // Revalidate. Awaited only when there is no cache to fall back on — with a
  // cache we can return instantly and let this settle behind the first frame.
  const revalidate = authApi
    .fetchCurrentUser()
    .then(async (user) => {
      await cacheUser({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar ?? null,
      });
      return user;
    })
    .catch(() => null);

  if (cached) {
    // Fire and forget; the store is updated when it lands.
    void revalidate.then((fresh) => {
      if (fresh) useStore.getState().setCurrentUser(fresh);
    });
    return {
      ...MOCK_USER,
      id: cached.id,
      firstName: cached.firstName,
      lastName: cached.lastName,
      email: cached.email,
      avatar: cached.avatar ?? undefined,
    };
  }

  // No cache: this is the one path that must wait, because there is nothing
  // to show until it answers.
  return await revalidate;
}
