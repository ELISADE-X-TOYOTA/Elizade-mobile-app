import { UserProfile } from '../domain/types';
import { apiFetch } from './client';
import { setToken } from './session';

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
  return data;
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
