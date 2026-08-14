import { apiFetch } from './client';
import type { WatchlistItemDto } from './dto';

/**
 * Customer watchlist — backend `/watchlist` router.
 *
 * IMPORTANT: this tracks a MODEL the customer is interested in
 * (`model` + optional `trim`/`color`), not a specific listing. There is no
 * `vehicleId` on the record. It answers "tell me about Land Cruisers", not
 * "save this exact car" — which is what the favourites heart does, separately
 * and on-device.
 */

export interface WatchlistCreateBody {
  model: string;
  trim?: string | null;
  color?: string | null;
}

export interface WatchlistUpdateBody {
  trim?: string | null;
  color?: string | null;
  isActive?: boolean;
}

export const watchlistApi = {
  /** Active items only — the API filters out removed ones. */
  list: () => apiFetch<WatchlistItemDto[]>('/watchlist'),

  /**
   * 409 when that MODEL is already tracked. Uniqueness is on `model` alone, so
   * "Land Cruiser VX" collides with an existing "Land Cruiser GR" entry.
   */
  add: (body: WatchlistCreateBody) =>
    apiFetch<WatchlistItemDto>('/watchlist', { method: 'POST', body }),

  update: (id: string, body: WatchlistUpdateBody) =>
    apiFetch<WatchlistItemDto>(`/watchlist/${id}`, { method: 'PATCH', body }),

  /** Soft delete server-side; the row stops appearing in `list`. */
  remove: (id: string) => apiFetch<void>(`/watchlist/${id}`, { method: 'DELETE' }),
};
