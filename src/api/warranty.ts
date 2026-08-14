import { apiFetch } from './client';
import type { CustomerRecallDto, WarrantyCertificateDto, WarrantyClaimDto, WarrantyEligibilityDto } from './dto';

/** Customer warranty endpoints — backend `/warranty` router. */

export interface CreateClaimBody {
  ownedVehicleId: string;
  claimType: string;
  description: string;
  conditions?: string | null;
  currentMileage?: number | null;
}

export const warrantyApi = {
  certificates: () => apiFetch<WarrantyCertificateDto[]>('/warranty/certificates'),
  recalls: () => apiFetch<CustomerRecallDto[]>('/warranty/recalls'),
  claims: () => apiFetch<WarrantyClaimDto[]>('/warranty/claims'),
  createClaim: (body: CreateClaimBody) =>
    apiFetch<WarrantyClaimDto>('/warranty/claims', { method: 'POST', body }),
  eligibility: (ownedVehicleId: string) =>
    apiFetch<WarrantyEligibilityDto>('/warranty/eligibility', { query: { ownedVehicleId } }),
};
