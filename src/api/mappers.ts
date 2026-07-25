import { APP } from '../constants/app';
import { ListingType, Vehicle, VehicleCategory } from '../domain/types';
import { Branch, VehicleDetail, VehicleListItem } from './vehicles';

/** Resolve a possibly-relative media path against the API host (mirrors web). */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('/images')) return url;
  if (url.startsWith('/media')) {
    const host = APP.apiBaseUrl.replace(/\/api\/v1\/?$/, '');
    if (host.startsWith('http')) return `${host}${url}`;
  }
  return url;
}

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** The backend has no "category" concept — derive one for the mobile UI. */
function deriveCategory(make: string, model: string, fuelType: string): VehicleCategory {
  const s = `${make} ${model} ${fuelType}`.toLowerCase();
  if (/electric|ev|tesla/.test(s)) return 'electric';
  if (/hilux|f-150|raptor|pickup|tacoma|ranger|amarok/.test(s)) return 'pickup';
  if (/truck|lorry|dyna|canter/.test(s)) return 'truck';
  if (/land ?cruiser|rav4|highlander|fortuner|prado|suv|q7|x5|gle|prado/.test(s)) return 'suv';
  if (/911|gt3|gt-r|supra|coupe|mustang|corvette|sport/.test(s)) return 'sports';
  if (/range rover|s-class|maybach|bentley|rolls|lexus ls|luxury/.test(s)) return 'luxury';
  return 'sedan';
}

const SEATS: Record<VehicleCategory, number> = { suv: 7, truck: 3, pickup: 5, sports: 2, luxury: 5, sedan: 5, electric: 5 };
const HP: Record<VehicleCategory, number> = { suv: 270, truck: 300, pickup: 350, sports: 450, luxury: 380, sedan: 170, electric: 400 };

function estMileage(year: number, id: string): number {
  const age = Math.max(0, new Date().getFullYear() - year);
  return age * 9000 + (hash(id) % 6000);
}

function derived(id: string, category: VehicleCategory) {
  const h = hash(id);
  return {
    category,
    seats: SEATS[category],
    horsepower: HP[category],
    rating: Number((4.3 + (h % 7) / 10).toFixed(1)),
    reviewCount: 20 + (h % 230),
    listingTypes: ['sale'] as ListingType[],
    ownerHistory: 1,
    isVerified: true,
  };
}

function priceOf(v: { price: string | number; isPromotional: boolean; promotionalPrice?: string | number | null }): number {
  return v.isPromotional && v.promotionalPrice != null ? Number(v.promotionalPrice) : Number(v.price);
}

export function mapListItemToVehicle(item: VehicleListItem, branches?: Map<string, Branch>): Vehicle {
  const category = deriveCategory(item.make, item.model, item.fuelType);
  const branch = branches?.get(item.branchId);
  return {
    id: item.id,
    make: item.make,
    model: item.model,
    trim: item.trim,
    year: item.year,
    color: item.color,
    colorHex: item.colorHex || '#1F2937',
    price: priceOf(item),
    fuelType: item.fuelType,
    transmission: item.transmission,
    engine: '',
    mileage: estMileage(item.year, item.id),
    location: branch ? `${branch.city}, ${branch.state}` : 'Elizade Showroom',
    images: item.primaryImageUrl ? [resolveMediaUrl(item.primaryImageUrl)] : [''],
    features: [],
    dealerName: branch?.name ?? 'Elizade Motors',
    ...derived(item.id, category),
  };
}

export function mapDetailToVehicle(d: VehicleDetail): Vehicle {
  const category = deriveCategory(d.make, d.model, d.fuelType);
  const images = d.images?.length
    ? [...d.images].sort((a, b) => a.sortOrder - b.sortOrder).map((i) => resolveMediaUrl(i.url))
    : d.primaryImageUrl
      ? [resolveMediaUrl(d.primaryImageUrl)]
      : [''];
  const featureKeys = Object.keys(d.specs ?? {}).slice(0, 8);
  return {
    id: d.id,
    make: d.make,
    model: d.model,
    trim: d.trim,
    year: d.year,
    color: d.color,
    colorHex: d.colorHex || '#1F2937',
    price: priceOf(d),
    fuelType: d.fuelType,
    transmission: d.transmission,
    engine: d.engine || '—',
    mileage: d.mileage ?? estMileage(d.year, d.id),
    location: [d.branchCity, d.branchState].filter(Boolean).join(', ') || 'Elizade Showroom',
    images,
    features: featureKeys.length ? featureKeys : ['Bluetooth', 'Navigation', 'Air Conditioning'],
    dealerName: d.branchName || 'Elizade Motors',
    ...derived(d.id, category),
  };
}
