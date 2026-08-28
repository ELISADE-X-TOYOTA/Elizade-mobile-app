import { apiFetch } from './client';

/** Customer availability-alert subscription state from `/vehicles/{id}/notify-me`. */
export interface NotifyMeStatusDto {
  vehicleId: string;
  subscribed: boolean;
  subscriptionId?: string | null;
  createdAt?: string | null;
}

export interface NotifyMeApi {
  status: (vehicleId: string) => Promise<NotifyMeStatusDto>;
  subscribe: (vehicleId: string) => Promise<NotifyMeStatusDto>;
  unsubscribe: (vehicleId: string) => Promise<void>;
}

const pathFor = (vehicleId: string) => `/vehicles/${encodeURIComponent(vehicleId)}/notify-me`;

export const notifyMeApi: NotifyMeApi = {
  status: (vehicleId) => apiFetch<NotifyMeStatusDto>(pathFor(vehicleId)),
  subscribe: (vehicleId) =>
    apiFetch<NotifyMeStatusDto>(pathFor(vehicleId), { method: 'POST' }),
  unsubscribe: (vehicleId) =>
    apiFetch<void>(pathFor(vehicleId), { method: 'DELETE' }),
};
