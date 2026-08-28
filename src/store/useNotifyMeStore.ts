import { create } from 'zustand';
import {
  fetchNotifyMeStatus,
  subscribeToNotifyMe,
  unsubscribeFromNotifyMe,
} from '../data/notifyMeRepository';
import { NotifyMeStatus } from '../domain/types';

interface NotifyMeState {
  statuses: Record<string, NotifyMeStatus>;
  loading: Record<string, boolean>;
  errors: Record<string, string | undefined>;
  load: (vehicleId: string) => Promise<void>;
  subscribe: (vehicleId: string) => Promise<void>;
  unsubscribe: (vehicleId: string) => Promise<void>;
}

/** Runtime state for availability alerts; subscriptions stay server-backed. */
export const useNotifyMeStore = create<NotifyMeState>((set) => {
  const setLoading = (vehicleId: string, value: boolean) =>
    set((state) => ({
      loading: { ...state.loading, [vehicleId]: value },
      errors: { ...state.errors, [vehicleId]: undefined },
    }));

  const setError = (vehicleId: string, error: unknown) =>
    set((state) => ({
      loading: { ...state.loading, [vehicleId]: false },
      errors: {
        ...state.errors,
        [vehicleId]: error instanceof Error ? error.message : 'Could not update this alert.',
      },
    }));

  return {
    statuses: {},
    loading: {},
    errors: {},

    load: async (vehicleId) => {
      setLoading(vehicleId, true);
      try {
        const status = await fetchNotifyMeStatus(vehicleId);
        set((state) => ({
          statuses: { ...state.statuses, [vehicleId]: status },
          loading: { ...state.loading, [vehicleId]: false },
        }));
      } catch (error) {
        setError(vehicleId, error);
      }
    },

    subscribe: async (vehicleId) => {
      setLoading(vehicleId, true);
      try {
        const status = await subscribeToNotifyMe(vehicleId);
        set((state) => ({
          statuses: { ...state.statuses, [vehicleId]: status },
          loading: { ...state.loading, [vehicleId]: false },
        }));
      } catch (error) {
        setError(vehicleId, error);
        throw error;
      }
    },

    unsubscribe: async (vehicleId) => {
      setLoading(vehicleId, true);
      try {
        await unsubscribeFromNotifyMe(vehicleId);
        set((state) => ({
          statuses: {
            ...state.statuses,
            [vehicleId]: { vehicleId, subscribed: false, subscriptionId: null, createdAt: null },
          },
          loading: { ...state.loading, [vehicleId]: false },
        }));
      } catch (error) {
        setError(vehicleId, error);
        throw error;
      }
    },
  };
});
