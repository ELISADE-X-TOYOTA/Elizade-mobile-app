import { apiFetch } from '../api/client';
import { APP } from '../constants/app';
import { AppNotification } from '../domain/types';
import { NOTIFICATIONS } from './mock';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let items: AppNotification[] = NOTIFICATIONS.map((n) => ({ ...n }));

export async function fetchNotifications(): Promise<AppNotification[]> {
  if (APP.useMock) {
    await delay(300);
    return [...items];
  }
  return apiFetch<AppNotification[]>('/notifications');
}

export async function markNotificationRead(id: string): Promise<void> {
  if (APP.useMock) {
    items = items.map((n) => (n.id === id ? { ...n, read: true } : n));
    return;
  }
  await apiFetch(`/notifications/${id}/read`, { method: 'POST' });
}

export async function markAllNotificationsRead(): Promise<void> {
  if (APP.useMock) {
    items = items.map((n) => ({ ...n, read: true }));
    return;
  }
  await apiFetch('/notifications/read-all', { method: 'POST' });
}
