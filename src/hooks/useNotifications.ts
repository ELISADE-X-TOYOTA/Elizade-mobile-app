import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../data/notificationsRepository';
import { AppNotification, UserProfile } from '../domain/types';
import { useStore } from '../store/useStore';

/** Stable id for the locally-generated first-login welcome. */
export const WELCOME_NOTIFICATION_ID = 'local-welcome';

/**
 * Welcome notice for a newly-onboarded customer.
 *
 * The backend has no customer-facing "create notification" endpoint, so this
 * is generated on-device and merged into the server list; its read state
 * persists via `readLocalNotificationIds`.
 */
function welcomeNotification(user: UserProfile, read: boolean): AppNotification {
  return {
    id: WELCOME_NOTIFICATION_ID,
    type: 'general',
    title: `Welcome to Elizade Connect, ${user.firstName}!`,
    body: 'Your account is ready. Browse the showroom, book a service, and add your vehicle to unlock warranty and service history.',
    createdAt: new Date().toISOString(),
    read,
    route: '/(tabs)/shop',
  };
}

export function useNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const user = useStore((s) => s.currentUser);
  const onboardedIds = useStore((s) => s.onboardedUserIds);
  const readLocalIds = useStore((s) => s.readLocalNotificationIds);
  const markLocalRead = useStore((s) => s.markLocalNotificationRead);

  const load = useCallback(() => {
    setLoading(true);
    fetchNotifications()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  /**
   * Prepend the welcome notice for a first-time customer. It stops being
   * generated once they've both read it and finished the tour, so it never
   * becomes permanent clutter.
   */
  const merged = useMemo(() => {
    if (!user) return items;
    const wasRead = readLocalIds.includes(WELCOME_NOTIFICATION_ID);
    const finishedTour = onboardedIds.includes(user.id);
    if (wasRead && finishedTour) return items;
    return [welcomeNotification(user, wasRead), ...items];
  }, [items, user, readLocalIds, onboardedIds]);

  const markRead = useCallback(
    (id: string) => {
      if (id === WELCOME_NOTIFICATION_ID) {
        markLocalRead(id);
        return;
      }
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      markNotificationRead(id);
    },
    [markLocalRead],
  );

  const markAllRead = useCallback(() => {
    markLocalRead(WELCOME_NOTIFICATION_ID);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    markAllNotificationsRead();
  }, [markLocalRead]);

  const unread = merged.filter((n) => !n.read).length;
  return { items: merged, unread, loading, reload: load, markRead, markAllRead };
}
