import { mapCertificate, mapClaim, mapRecall } from '../api/customer-mappers';
import { CreateClaimBody, warrantyApi } from '../api/warranty';
import { APP } from '../constants/app';
import { RecallNotice, WarrantyCertificate, WarrantyClaim, WarrantyEligibility } from '../domain/types';
import { RECALLS, WARRANTY_CERTIFICATES, WARRANTY_CLAIMS, ownedVehicleById } from './mock';
import { fetchOwnedVehicles } from './garageRepository';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let mockClaims: WarrantyClaim[] = [...WARRANTY_CLAIMS];

export async function fetchCertificates(): Promise<WarrantyCertificate[]> {
  if (APP.useMock) {
    await delay(400);
    return WARRANTY_CERTIFICATES;
  }
  // Certificates don't carry the VIN, so pair them with the garage by label.
  const [certs, vehicles] = await Promise.all([
    warrantyApi.certificates(),
    fetchOwnedVehicles().catch(() => []),
  ]);
  return certs.map((c) => {
    const v = vehicles.find((ov) => `${ov.year} ${ov.make} ${ov.model}` === c.vehicleLabel);
    return mapCertificate(c, v?.vin ?? '');
  });
}

export async function fetchRecalls(): Promise<RecallNotice[]> {
  if (APP.useMock) {
    await delay(400);
    return RECALLS;
  }
  return (await warrantyApi.recalls()).map(mapRecall);
}

export async function fetchClaims(): Promise<WarrantyClaim[]> {
  if (APP.useMock) {
    await delay(400);
    return [...mockClaims];
  }
  return (await warrantyApi.claims()).map(mapClaim);
}

/**
 * Is this vehicle still covered? Called when the claim sheet opens so the
 * customer is told up front, rather than by a 422 after writing it all out.
 */
export async function fetchEligibility(vehicleId: string): Promise<WarrantyEligibility> {
  if (APP.useMock) {
    await delay(250);
    // Derived from one in-service date rather than hand-picked, so the mock
    // stays self-consistent: the old fixture had a null in-service date but a
    // live coverage end, which the backend can never produce.
    const inService = new Date();
    inService.setMonth(inService.getMonth() - 26);
    const plusMonths = (m: number) => {
      const d = new Date(inService);
      d.setMonth(d.getMonth() + m);
      return d.toISOString();
    };
    return {
      eligible: true,
      reason: null,
      inServiceDate: inService.toISOString(),
      coverageEnd: plusMonths(36),
      mileageLimitKm: 100_000,
      warrantyMonths: 36,
      currentMileage: 24_500,
      certificateNumber: 'ELZ-WC-0001',
      // 26 months in: past free replacement (24), inside pro-rata (36).
      // Deliberately the interesting case — basic cover live, battery partial.
      batteryFreeMonths: 24,
      batteryPartialMonths: 36,
      batteryFreeCoverageEnd: plusMonths(24),
      batteryPartialCoverageEnd: plusMonths(36),
      batteryStatus: 'partial',
      batteryEligible: true,
    };
  }
  const d = await warrantyApi.eligibility(vehicleId);
  return { ...d };
}

export async function createClaim(body: CreateClaimBody): Promise<WarrantyClaim> {
  if (APP.useMock) {
    await delay(700);
    const owned = ownedVehicleById(body.ownedVehicleId);
    const claim: WarrantyClaim = {
      id: `wcl${Date.now()}`,
      vehicleTitle: `${owned.make} ${owned.model} ${owned.trim}`,
      category: body.claimType,
      description: body.description,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    };
    mockClaims = [claim, ...mockClaims];
    return claim;
  }
  return mapClaim(await warrantyApi.createClaim(body));
}
