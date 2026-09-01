import { ApiError } from '../api/client';
import { PriceBookEntryDto, priceBoardApi } from '../api/priceBoard';
import { APP } from '../constants/app';

/**
 * Published service prices, shaped for a phone.
 *
 * The showroom kiosk renders a 9-column grid. That does not survive a 390pt
 * screen, so the board is reduced here to "one model, one mileage band, a list
 * of priced items" and the screen picks the two axes.
 */

export type PriceGroup = 'periodic' | 'chassis' | 'engine';

/**
 * A catalogue row. Carries no price: the price depends on the model and band
 * the customer has selected, so it is looked up per render from `prices`.
 */
export interface PricedItem {
  code: string;
  name: string;
  group: PriceGroup;
  sortOrder: number;
}

export interface PriceBoard {
  /** Empty when nothing is published. `hasPrices` is the flag to branch on. */
  hasPrices: boolean;
  models: string[];
  mileageBandsKm: number[];
  currency: string;
  priceInclusive: boolean;
  disclaimer: string | null;
  versionNumber: number | null;
  /** Keyed `${model}|${code}|${band}`. */
  prices: Map<string, number>;
  items: PricedItem[];
}

const EMPTY: PriceBoard = {
  hasPrices: false,
  models: [],
  mileageBandsKm: [],
  currency: 'NGN',
  priceInclusive: true,
  disclaimer: null,
  versionNumber: null,
  prices: new Map(),
  items: [],
};

const GROUPS: PriceGroup[] = ['periodic', 'chassis', 'engine'];

function toGroup(raw: string): PriceGroup {
  const g = raw?.toLowerCase();
  return (GROUPS as string[]).includes(g) ? (g as PriceGroup) : 'periodic';
}

/**
 * Money in, number out — or null.
 *
 * The API sends a JSON number today but is typed `Decimal` server-side, and a
 * serialiser change would start sending strings. Returning null rather than
 * NaN means an unparseable price renders as a dash instead of "₦NaN".
 */
function toAmount(value: number | string): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function priceKey(model: string, code: string, bandKm: number): string {
  return `${model}|${code}|${bandKm}`;
}

export async function fetchPriceBoard(): Promise<PriceBoard> {
  if (APP.useMock) {
    // No bundled fixture: the demo build has no invented prices to show, and
    // fabricating them here is exactly how fake money reaches a real customer.
    return EMPTY;
  }

  const [board, items] = await Promise.all([
    priceBoardApi.board().catch((e: unknown) => {
      // 404 is the documented "nothing published yet" answer, not a failure.
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }),
    priceBoardApi.items().catch(() => []),
  ]);

  if (!board) return EMPTY;

  const prices = new Map<string, number>();
  board.entries.forEach((entry: PriceBookEntryDto) => {
    const amount = toAmount(entry.price);
    if (amount === null) return;
    prices.set(priceKey(entry.vehicleModel, entry.serviceItemCode, entry.mileageBandKm), amount);
  });

  // Catalogue order comes from the board's own sortOrder, which mirrors the row
  // order on the showroom wall — familiar to staff reading it alongside a
  // customer. Alphabetical would be a different board.
  const priced: PricedItem[] = items
    .filter((i) => i.isActive)
    .map((i) => ({
      code: i.code,
      name: i.name,
      group: toGroup(i.group),
      sortOrder: i.sortOrder,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  return {
    hasPrices: prices.size > 0,
    models: board.vehicleModels,
    mileageBandsKm: board.mileageBandsKm,
    currency: board.version.currency || 'NGN',
    priceInclusive: board.version.priceInclusive,
    disclaimer: board.version.disclaimer,
    versionNumber: board.version.versionNumber,
    prices,
    items: priced,
  };
}
