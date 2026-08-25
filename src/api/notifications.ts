import { apiFetch } from './client';
import type { NotificationDto } from './dto';

/** Customer notifications — backend `/notifications` router. */

export interface DeviceRegisterBody {
  token: string;
  platform: 'ios' | 'android';
}

/** One cell of the preference matrix. */
export interface PreferenceItemDto {
  category: string;
  channel: string;
  enabled: boolean;
}

export interface PreferencesDto {
  items: PreferenceItemDto[];
}

export const notificationsApi = {
  list: (unreadOnly = false) =>
    apiFetch<NotificationDto[]>('/notifications', {
      query: unreadOnly ? { unreadOnly: true } : undefined,
    }),

  markRead: (id: string) => apiFetch<void>(`/notifications/${id}/read`, { method: 'POST' }),

  markAllRead: () => apiFetch<{ updated: number }>('/notifications/read-all', { method: 'POST' }),

  unreadCount: () => apiFetch<{ unread: number }>('/notifications/unread-count'),

  /** Idempotent on the token — safe to call on every sign-in. */
  registerDevice: (body: DeviceRegisterBody) =>
    apiFetch<{ registered: boolean }>('/notifications/devices', { method: 'POST', body }),

  unregisterDevice: (token: string) =>
    apiFetch<void>(`/notifications/devices/${encodeURIComponent(token)}`, { method: 'DELETE' }),

  /**
   * Always returns the FULL matrix, not just stored deviations — the client
   * should not have to know the server's defaults to render a settings screen.
   */
  preferences: () => apiFetch<PreferencesDto>('/notifications/preferences'),

  updatePreferences: (items: PreferenceItemDto[]) =>
    apiFetch<PreferencesDto>('/notifications/preferences', { method: 'PATCH', body: { items } }),
};
