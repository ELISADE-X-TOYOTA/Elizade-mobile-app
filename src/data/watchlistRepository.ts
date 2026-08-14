import type { WatchlistItemDto } from '../api/dto';
import { ApiError } from '../api/client';
import { WatchlistCreateBody, WatchlistUpdateBody, watchlistApi } from '../api/watchlist';
import { APP } from '../constants/app';
import { WatchlistItem } from '../domain/types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** In-memory mock list so heart + screen work offline in demo mode. */
let mockItems: WatchlistItem[] = [];

function mapItem(d: WatchlistItemDto): WatchlistItem {
  return {
    id: d.id,
    model: d.model,
    trim: d.trim,
    color: d.color,
    isActive: d.isActive,
    createdAt: d.createdAt,
  };
}

export async function listWatchlist(): Promise<WatchlistItem[]> {
  if (APP.useMock) {
    await delay(300);
    return [...mockItems];
  }
  return (await watchlistApi.list()).map(mapItem);
}

export async function addWatchlistItem(body: WatchlistCreateBody): Promise<WatchlistItem> {
  if (APP.useMock) {
    await delay(400);
    const existing = mockItems.find((i) => i.model === body.model.trim() && i.isActive);
    if (existing) throw new ApiError('Model already in watchlist', 409);
    const item: WatchlistItem = {
      id: `wl-${Date.now()}`,
      model: body.model.trim(),
      trim: body.trim?.trim() || null,
      color: body.color?.trim() || null,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    mockItems = [item, ...mockItems];
    return item;
  }
  return mapItem(await watchlistApi.add(body));
}

export async function updateWatchlistItem(
  itemId: string,
  body: WatchlistUpdateBody,
): Promise<WatchlistItem> {
  if (APP.useMock) {
    await delay(350);
    const idx = mockItems.findIndex((i) => i.id === itemId);
    if (idx < 0) throw new ApiError('Watchlist item not found', 404);
    const next = { ...mockItems[idx] };
    if (body.trim !== undefined) next.trim = body.trim?.trim() || null;
    if (body.color !== undefined) next.color = body.color?.trim() || null;
    if (body.isActive !== undefined) next.isActive = body.isActive;
    mockItems = mockItems.map((i, n) => (n === idx ? next : i)).filter((i) => i.isActive);
    return next;
  }
  return mapItem(await watchlistApi.update(itemId, body));
}

export async function removeWatchlistItem(itemId: string): Promise<void> {
  if (APP.useMock) {
    await delay(300);
    mockItems = mockItems.filter((i) => i.id !== itemId);
    return;
  }
  await watchlistApi.remove(itemId);
}
