import { apiFetch } from '../api/client';
import { clearSession } from '../api/session';
import { APP } from '../constants/app';

/**
 * Deleting the customer's own account — backend `/users/me/deletion-code` and
 * `/users/me/delete`.
 *
 * Two steps on purpose. Deletion cannot be undone, so a signed-in phone is not
 * proof enough: the code goes to the account's email, exactly as signing in
 * does, and only that code completes the deletion.
 */

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Step 1: email the confirmation code. Resolves to its lifetime in minutes. */
export async function requestDeletionCode(): Promise<number> {
  if (APP.useMock) {
    await delay(600);
    return 10;
  }
  const res = await apiFetch<{ expiresInMinutes?: number }>('/users/me/deletion-code', { method: 'POST' });
  const minutes = Number(res?.expiresInMinutes);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 10;
}

/**
 * Step 2: confirm with the code. On success the account is gone server-side,
 * so the local session is cleared here as well — every token on this device
 * is already dead, and leaving them would only produce 401s.
 */
export async function deleteAccount(code: string): Promise<void> {
  if (!APP.useMock) {
    await apiFetch<void>('/users/me/delete', { method: 'POST', body: { code: code.trim() } });
  } else {
    await delay(700);
  }
  await clearSession();
}
