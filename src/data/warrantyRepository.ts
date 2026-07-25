import { CreateClaimBody, warrantyApi } from '../api/warranty';
import { APP } from '../constants/app';
import { RecallNotice, WarrantyCertificate, WarrantyClaim } from '../domain/types';
import { RECALLS, WARRANTY_CERTIFICATES, WARRANTY_CLAIMS, ownedVehicleById } from './mock';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let mockClaims: WarrantyClaim[] = [...WARRANTY_CLAIMS];

export async function fetchCertificates(): Promise<WarrantyCertificate[]> {
  if (APP.useMock) {
    await delay(400);
    return WARRANTY_CERTIFICATES;
  }
  return warrantyApi.certificates();
}

export async function fetchRecalls(): Promise<RecallNotice[]> {
  if (APP.useMock) {
    await delay(400);
    return RECALLS;
  }
  return warrantyApi.recalls();
}

export async function fetchClaims(): Promise<WarrantyClaim[]> {
  if (APP.useMock) {
    await delay(400);
    return [...mockClaims];
  }
  return warrantyApi.claims();
}

export async function createClaim(body: CreateClaimBody): Promise<WarrantyClaim> {
  if (APP.useMock) {
    await delay(700);
    const owned = ownedVehicleById(body.vehicleId);
    const claim: WarrantyClaim = {
      id: `wcl${Date.now()}`,
      vehicleTitle: `${owned.make} ${owned.model} ${owned.trim}`,
      category: body.category,
      description: body.description,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    };
    mockClaims = [claim, ...mockClaims];
    return claim;
  }
  return warrantyApi.createClaim(body);
}
