import { UserProfile } from '../domain/types';
import { apiFetch } from './client';
import { setToken } from './session';

/** Mirrors the web auth-api. OTP is delivered to a phone for register; login
 *  passes an email (backend must support email-OTP for login). */
export interface OtpRequestBody {
  phone?: string;
  email?: string;
  purpose: 'login' | 'register';
  firstName?: string;
  lastName?: string;
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

export async function verifyOtp(params: { phone?: string; email?: string; code: string }) {
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
