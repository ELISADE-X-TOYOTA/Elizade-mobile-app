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

  /**
   * Checked BEFORE a claim is filed. `POST /warranty/claims` 422s an
   * ineligible vehicle, so without this the customer only learns the car is
   * out of cover after describing the fault.
   */
  eligibility: (ownedVehicleId: string) =>
    apiFetch<WarrantyEligibilityDto>('/warranty/eligibility', {
      query: { ownedVehicleId },
    }),
  createClaim: (body: CreateClaimBody) =>
    apiFetch<WarrantyClaimDto>('/warranty/claims', { method: 'POST', body }),
};
