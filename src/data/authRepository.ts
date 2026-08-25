import { unregisterFromPush } from './pushRepository';
import * as authApi from '../api/auth';
import { setToken } from '../api/session';
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
  await setToken(null);
}
