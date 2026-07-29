import { apiFetch } from './client';
import type { OwnedVehicleDto, OwnershipRequestDto, VinLookupDto } from './dto';

/**
 * Garage / ownership endpoints — backend `/ownership` router.
 *
 * Claiming a vehicle is a *request* (staff verify the VIN against purchase
 * records), so adding one returns an OwnershipRequest rather than a vehicle.
 */
export const garageApi = {
  list: () => apiFetch<OwnedVehicleDto[]>('/ownership/vehicles'),

  /** Pre-flight check so the UI can confirm the VIN before submitting. */
  lookup: (vin: string) => apiFetch<VinLookupDto>('/ownership/lookup', { query: { vin } }),

  requests: () => apiFetch<OwnershipRequestDto[]>('/ownership/requests'),

  claim: (vin: string, registrationNumber?: string) =>
    apiFetch<OwnershipRequestDto>('/ownership/requests', {
      method: 'POST',
      body: { vin, registrationNumber: registrationNumber ?? null, documentUrls: [] },
    }),
};
