import { apiFetch } from './client';

/** Public inventory endpoints — mirror the web inventory-api types/shapes. */

export interface VehicleImage {
  id: string;
  url: string;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface VehicleListItem {
  id: string;
  make: string;
  model: string;
  trim: string;
  year: number;
  color: string;
  colorHex: string;
  price: string | number;
  promotionalPrice?: string | number | null;
  isPromotional: boolean;
  promotionLabel?: string | null;
  fuelType: string;
  transmission: string;
  availability: string;
  branchId: string;
  primaryImageUrl?: string | null;
  createdAt: string;
}

export interface VehicleListResponse {
  items: VehicleListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface VehicleDetail extends VehicleListItem {
  engine: string;
  mileage?: number | null;
  branchName: string;
  branchCity: string;
  branchState: string;
  specs: Record<string, string>;
  images: VehicleImage[];
  vin?: string;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
  state: string;
  /** `showroom` | `service_centre` | `both` — test drives require showroom/both. */
  type?: string;
  address?: string;
}

export interface ListVehiclesParams {
  make?: string;
  model?: string;
  minPrice?: number;
  maxPrice?: number;
  fuelType?: string;
  transmission?: string;
  availability?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export function listPublicVehicles(params: ListVehiclesParams = {}) {
  return apiFetch<VehicleListResponse>('/vehicles', {
    query: { ...params } as Record<string, string | number | boolean | undefined | null>,
    auth: false,
  });
}

export function getPublicVehicle(id: string) {
  return apiFetch<VehicleDetail>(`/vehicles/${id}`, { auth: false });
}

export function listBranches() {
  return apiFetch<Branch[]>('/branches', { auth: false });
}
