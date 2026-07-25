import { OwnedVehicle } from '../domain/types';
import { apiFetch } from './client';

/** Owned-vehicle (garage) endpoints — mirror the web customers-api. */
export const garageApi = {
  list: () => apiFetch<OwnedVehicle[]>('/customers/me/vehicles'),
  get: (id: string) => apiFetch<OwnedVehicle>(`/customers/me/vehicles/${id}`),
  add: (vin: string) => apiFetch<OwnedVehicle>('/customers/me/vehicles', { method: 'POST', body: { vin } }),
};
