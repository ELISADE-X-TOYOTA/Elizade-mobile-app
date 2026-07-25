import { garageApi } from '../api/garage';
import { APP } from '../constants/app';
import { OwnedVehicle, ServiceHistoryItem, WarrantyCertificate } from '../domain/types';
import { OWNED_VEHICLES, SERVICE_HISTORY, WARRANTY_CERTIFICATES } from './mock';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let owned: OwnedVehicle[] = [...OWNED_VEHICLES];

export async function fetchOwnedVehicles(): Promise<OwnedVehicle[]> {
  if (APP.useMock) {
    await delay(400);
    return [...owned];
  }
  return garageApi.list();
}

export async function fetchOwnedVehicle(id: string): Promise<OwnedVehicle | undefined> {
  if (APP.useMock) {
    await delay(250);
    return owned.find((v) => v.id === id);
  }
  return garageApi.get(id);
}

/** History & warranty for a specific owned vehicle (mock filters bundled data). */
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
  // Real backend would expose these under the vehicle resource.
  return { history: [], warranty: undefined };
}

export async function addVehicleByVin(vin: string): Promise<OwnedVehicle> {
  if (APP.useMock) {
    await delay(800);
    const v: OwnedVehicle = {
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
    };
    owned = [...owned, v];
    return v;
  }
  return garageApi.add(vin);
}
