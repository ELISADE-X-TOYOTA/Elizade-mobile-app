import { mapCertificate, mapClaim, mapRecall } from '../api/customer-mappers';
import { CreateClaimBody, warrantyApi } from '../api/warranty';
import { APP } from '../constants/app';
import { RecallNotice, WarrantyCertificate, WarrantyClaim } from '../domain/types';
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
