import * as authApi from '../api/auth';
import { setToken } from '../api/session';
import { APP } from '../constants/app';
import { UserProfile } from '../domain/types';
import { MOCK_USER } from './mock';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Request a one-time code. Login sends an email; register sends phone+email. */
export async function requestOtp(body: authApi.OtpRequestBody): Promise<void> {
  if (APP.useMock) {
    await delay(700);
    return;
  }
  await authApi.requestOtp(body);
}

/** Verify the code and return the signed-in user (token persisted internally). */
export async function verifyOtp(params: {
  phone?: string;
  email?: string;
  code: string;
  profile?: Partial<UserProfile>;
}): Promise<UserProfile> {
  if (APP.useMock) {
    await delay(700);
    await setToken('mock-token');
    return {
      ...MOCK_USER,
      ...params.profile,
      email: params.email ?? params.profile?.email ?? MOCK_USER.email,
      phone: params.phone ?? MOCK_USER.phone,
    };
  }
  const res = await authApi.verifyOtp({ phone: params.phone, email: params.email, code: params.code });
  return res.user;
}

export async function logout(): Promise<void> {
  await setToken(null);
}
