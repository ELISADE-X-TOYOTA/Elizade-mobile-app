import { Branch, getPublicVehicle, listBranches, listPublicVehicles } from '../api/vehicles';
import { mapDetailToVehicle, mapListItemToVehicle } from '../api/mappers';
import { APP } from '../constants/app';
import { Vehicle } from '../domain/types';
import { VEHICLES, vehicleById } from './mock';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Branch lookup is cached so list items can resolve a location once. */
let branchCache: Map<string, Branch> | null = null;
async function branchMap(): Promise<Map<string, Branch>> {
  if (branchCache) return branchCache;
  try {
    const list = await listBranches();
    branchCache = new Map(list.map((b) => [b.id, b]));
  } catch {
    branchCache = new Map();
  }
  return branchCache;
}

/** Server-side query options passed straight through to `GET /vehicles`. */
export interface VehicleQuery {
  q?: string;
  fuelType?: string;
  transmission?: string;
  maxPrice?: number;
  sort?: string;
}

/** All vehicles — from the live API, or bundled mock data when USE_MOCK. */
export async function fetchVehicles(query: VehicleQuery = {}): Promise<Vehicle[]> {
  if (APP.useMock) {
    await delay(500);
    const q = query.q?.trim().toLowerCase();
    return VEHICLES.filter((v) => {
      if (query.fuelType && v.fuelType !== query.fuelType) return false;
      if (query.transmission && v.transmission !== query.transmission) return false;
      if (query.maxPrice && v.price > query.maxPrice) return false;
      if (q) {
        const haystack = `${v.make} ${v.model} ${v.trim} ${v.color} ${v.year}`.toLowerCase();
        return q.split(/\s+/).every((token) => haystack.includes(token));
      }
      return true;
    });
  }
  const [res, branches] = await Promise.all([
    listPublicVehicles({ limit: 50, ...query }),
    branchMap(),
  ]);
  return res.items.map((item) => mapListItemToVehicle(item, branches));
}

export async function fetchVehicle(id: string): Promise<Vehicle> {
  if (APP.useMock) {
    await delay(300);
    return vehicleById(id);
  }
  return mapDetailToVehicle(await getPublicVehicle(id));
}
