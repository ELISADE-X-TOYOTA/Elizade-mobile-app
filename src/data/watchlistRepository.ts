import { ApiError } from '../api/client';
import { mapWatchlistItem } from '../api/customer-mappers';
import { watchlistApi, WatchlistCreateBody, WatchlistUpdateBody } from '../api/watchlist';
import { APP } from '../constants/app';
import { WatchlistItem } from '../domain/types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** In-memory stand-in for mock mode. */
let mock: WatchlistItem[] = [
  {
    id: 'w1',
    model: 'Land Cruiser',
    trim: '300 VX',
    color: 'Attitude Black',
    isActive: true,
    createdAt: new Date(Date.now() - 86_400_000 * 3).toISOString(),
  },
];

/** Raised when the model is already tracked (API 409). */
export class AlreadyWatchedError extends Error {
  constructor(public model: string) {
    super(`You're already tracking the ${model}.`);
  }
}

export async function fetchWatchlist(): Promise<WatchlistItem[]> {
  if (APP.useMock) {
    await delay(300);
    return mock.filter((w) => w.isActive);
  }
  return (await watchlistApi.list()).map(mapWatchlistItem);
}

/**
 * Tracks a model.
 *
 * The API keys uniqueness on `model` ALONE, so adding a second entry for the
 * same model 409s no matter how the trim or colour differ. That is translated
 * into {@link AlreadyWatchedError} so callers can say something useful instead
 * of surfacing a raw conflict.
 */
export async function addToWatchlist(body: WatchlistCreateBody): Promise<WatchlistItem> {
  if (APP.useMock) {
    await delay(300);
    if (mock.some((w) => w.isActive && w.model.toLowerCase() === body.model.trim().toLowerCase())) {
      throw new AlreadyWatchedError(body.model);
    }
    const item: WatchlistItem = {
      id: `w${Date.now()}`,
      model: body.model.trim(),
      trim: body.trim?.trim() || null,
      color: body.color?.trim() || null,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    mock = [item, ...mock];
    return item;
  }
  try {
    return mapWatchlistItem(await watchlistApi.add(body));
  } catch (e) {
    // Match on the STATUS, not the message: `apiFetch` swaps a server detail
    // for a generic string whenever it looks unsafe to show, so the wording is
    // not something to depend on.
    if (e instanceof ApiError && e.status === 409) throw new AlreadyWatchedError(body.model);
    throw e;
  }
}

export async function updateWatchlistItem(
  id: string,
  body: WatchlistUpdateBody,
): Promise<WatchlistItem> {
  if (APP.useMock) {
    await delay(200);
    const item = mock.find((w) => w.id === id);
    if (!item) throw new Error('Watchlist item not found');
    if (body.trim !== undefined) item.trim = body.trim?.trim() || null;
    if (body.color !== undefined) item.color = body.color?.trim() || null;
    if (body.isActive !== undefined) item.isActive = body.isActive;
    return { ...item };
  }
  return mapWatchlistItem(await watchlistApi.update(id, body));
}

/** Soft-deletes server-side; the item stops appearing in the list either way. */
export async function removeFromWatchlist(id: string): Promise<void> {
  if (APP.useMock) {
    await delay(200);
    mock = mock.filter((w) => w.id !== id);
    return;
  }
  await watchlistApi.remove(id);
}
