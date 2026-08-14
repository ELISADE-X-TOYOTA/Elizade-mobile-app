import { mapCertificate, mapOwnedVehicle, mapServiceHistory } from '../api/customer-mappers';
import { garageApi } from '../api/garage';
import { serviceApi } from '../api/service';
import { warrantyApi } from '../api/warranty';
import { APP } from '../constants/app';
import { OwnedVehicle, ServiceHistoryItem, WarrantyCertificate } from '../domain/types';
import { OWNED_VEHICLES, SERVICE_HISTORY, WARRANTY_CERTIFICATES } from './mock';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let owned: OwnedVehicle[] = [...OWNED_VEHICLES];

/**
 * Cache of the last-loaded garage, keyed by vehicle id. Service appointments
 * reference a vehicle but carry no image, so they borrow one from here.
 */
const imageByVehicleId = new Map<string, string>();

export function ownedVehicleImage(vehicleId: string): string {
  return imageByVehicleId.get(vehicleId) ?? '';
}

export async function fetchOwnedVehicles(): Promise<OwnedVehicle[]> {
  if (APP.useMock) {
    await delay(400);
    owned.forEach((v) => imageByVehicleId.set(v.id, v.image));
    return [...owned];
  }
  const list = (await garageApi.list()).map(mapOwnedVehicle);
  list.forEach((v) => imageByVehicleId.set(v.id, v.image));
  return list;
}

export async function fetchOwnedVehicle(id: string): Promise<OwnedVehicle | undefined> {
  if (APP.useMock) {
    await delay(250);
    return owned.find((v) => v.id === id);
  }
  // The API has no per-vehicle GET; the list is small and already cached.
  return (await fetchOwnedVehicles()).find((v) => v.id === id);
}

/** History & warranty scoped to one owned vehicle. */
export async function fetchVehicleRecords(
  vehicleId: string,
): Promise<{ history: ServiceHistoryItem[]; warranty?: WarrantyCertificate }> {
  if (APP.useMock) {
    await delay(250);
    return {
      history: SERVICE_HISTORY.filter((h) => h.vehicleId === vehicleId),
      warranty: WARRANTY_CERTIFICATES.find((w) => w.vehicleId === vehicleId),
    };
  }

  const [historyRes, certs, vehicles] = await Promise.all([
    serviceApi.history(vehicleId).catch(() => ({ items: [] as never[] })),
    warrantyApi.certificates().catch(() => []),
    fetchOwnedVehicles().catch(() => [] as OwnedVehicle[]),
  ]);

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const history = (historyRes.items ?? [])
    .map(mapServiceHistory)
    .filter((h) => h.vehicleId === vehicleId);

  // Certificates identify their vehicle by label, not id.
  const label = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : '';
  const certDto = certs.find((c) => c.vehicleLabel === label) ?? certs[0];

  return {
    history,
    warranty: certDto ? mapCertificate(certDto, vehicle?.vin ?? '') : undefined,
  };
}

export interface ClaimResult {
  /** False when the VIN isn't recognised or is already claimed. */
  ok: boolean;
  message: string;
}

/**
 * Claiming is a *request* on the real backend — staff verify the VIN against
 * purchase records — so this returns an outcome message, not a vehicle.
 */
export async function addVehicleByVin(vin: string): Promise<ClaimResult> {
  if (APP.useMock) {
    await delay(800);
    owned = [
      ...owned,
      {
        id: `ov${Date.now()}`,
        vin,
        make: 'Toyota',
        model: 'Corolla',
        trim: 'LE',
        year: 2023,
        color: 'Classic Silver',
        colorHex: '#C9CCD0',
        mileage: 12_000,
        registrationNumber: 'NEW-000-XX',
        nextServiceDue: new Date(Date.now() + 90 * 86_400_000).toISOString(),
        nextServiceMileage: 15_000,
        image: '',
      },
    ];
    return { ok: true, message: 'Vehicle added to your garage.' };
  }

  const found = await garageApi.lookup(vin).catch(() => null);
  if (found && found.found === false) {
    return { ok: false, message: found.message ?? 'That VIN was not found in our records.' };
  }
  if (found?.alreadyClaimed) {
    return { ok: false, message: 'That vehicle is already linked to an account.' };
  }

  await garageApi.claim(vin);
  return {
    ok: true,
    message: 'Ownership request submitted. Our team will verify and confirm shortly.',
  };
}
