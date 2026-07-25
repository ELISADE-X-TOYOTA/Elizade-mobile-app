import { RecallNotice, WarrantyCertificate, WarrantyClaim } from '../domain/types';
import { apiFetch } from './client';

/** Warranty endpoints — mirror the web warranty-api. */
export interface CreateClaimBody {
  vehicleId: string;
  category: string;
  description: string;
}

export const warrantyApi = {
  certificates: () => apiFetch<WarrantyCertificate[]>('/warranty/certificates'),
  recalls: () => apiFetch<RecallNotice[]>('/warranty/recalls'),
  claims: () => apiFetch<WarrantyClaim[]>('/warranty/claims'),
  createClaim: (body: CreateClaimBody) =>
    apiFetch<WarrantyClaim>('/warranty/claims', { method: 'POST', body }),
};
