import { UserProfile } from '../domain/types';
import { apiFetch } from './client';
import { clearSession, getRefreshToken, setRefreshToken, setToken } from './session';

/**
 * Passwordless email OTP — matches the backend `/auth` router exactly.
 * `POST /auth/otp/request` takes { email, purpose, firstName?, lastName? };
 * registration supplies the names so the account is created on verify.
 */
export interface OtpRequestBody {
  email: string;
  purpose: 'login' | 'register';
  firstName?: string;
  lastName?: string;
  /** Optional middle / other name. */
  otherName?: string;
}

export interface AuthResponse {
  access_token: string;
  /** Long-lived grant used to renew the access token silently. */
  refresh_token: string | null;
  token_type: string;
  user: UserProfile;
}

export function requestOtp(body: OtpRequestBody) {
  return apiFetch<{ message: string; expires_in_minutes: number }>('/auth/otp/request', {
    method: 'POST',
    body,
    auth: false,
  });
}

export async function verifyOtp(params: { email: string; code: string }) {
  const data = await apiFetch<AuthResponse>('/auth/otp/verify', {
    method: 'POST',
    body: params,
    auth: false,
  });
  await setToken(data.access_token);
  // Older backends do not return one; the app still works, it just cannot
  // renew silently and falls back to signing in again when the token lapses.
  if (data.refresh_token) await setRefreshToken(data.refresh_token);
  return data;
}

/**
 * Ends the session on the server as well as this device.
 *
 * Local-only sign-out would leave a live refresh token on the backend — a
 * standing grant for a session the user believes they closed.
 */
export async function revokeSession(): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await apiFetch<void>('/auth/logout', {
        method: 'POST',
        body: { refreshToken },
        auth: false,
      });
    } catch {
      // Best effort. The local credentials are cleared regardless — failing to
      // reach the server must never trap someone in a session they left.
    }
  }
  await clearSession();
}

export function fetchCurrentUser() {
  return apiFetch<UserProfile>('/auth/me');
}

export interface EmailAvailability {
  email: string;
  available: boolean;
  reason: string | null;
}

/**
 * Read-only check used by the signup form while the user types.
 * Unlike `requestOtp`, this dispatches no code, so it is safe to poll.
 */
export function checkEmailAvailable(email: string) {
  return apiFetch<EmailAvailability>('/auth/email-available', {
    query: { email },
    auth: false,
  });
}
