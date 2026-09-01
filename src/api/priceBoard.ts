import { apiFetch } from './client';

/**
 * The published service price board — backend `/service-board` router.
 *
 * PUBLIC endpoints: the showroom kiosk reads them unauthenticated, so every
 * call passes `auth: false`. Sending a bearer token here would be harmless but
 * misleading — it would imply these prices are per-customer, and they are not.
 */

/**
 * `price` arrives as a JSON NUMBER, not a string.
 *
 * The backend types it `Decimal`, which Pydantic serialises as a bare number.
 * (The kiosk's own `types.ts` declares `string` and gets away with it only
 * because its formatter accepts both.) Typed as the union and coerced at the
 * edge, so a future change to either representation cannot render "NaN" at a
 * customer.
 */
export interface PriceBookEntryDto {
  id: string;
  serviceItemId: string;
  serviceItemCode: string;
  serviceItemName: string;
  serviceItemGroup: string;
  vehicleModelId: string;
  vehicleModel: string;
  mileageBandKm: number;
  price: number | string;
}

export interface PriceBookVersionDto {
  id: string;
  versionNumber: number;
  status: string;
  currency: string;
  priceInclusive: boolean;
  effectiveFrom: string | null;
  disclaimer: string | null;
  publishedAt: string | null;
  entryCount: number;
}

export interface PriceBookBoardDto {
  version: PriceBookVersionDto;
  mileageBandsKm: number[];
  vehicleModels: string[];
  entries: PriceBookEntryDto[];
}

export interface ServiceItemDto {
  id: string;
  code: string;
  name: string;
  group: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

export const priceBoardApi = {
  /**
   * 404 when nothing is published — a deliberate backend choice, not an error
   * to retry. The repository turns it into an empty board.
   */
  board: () => apiFetch<PriceBookBoardDto>('/service-board/price-book', { auth: false }),
  items: () => apiFetch<ServiceItemDto[]>('/service-board/items', { auth: false }),
};
