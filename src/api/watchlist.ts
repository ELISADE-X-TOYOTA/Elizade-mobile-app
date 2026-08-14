import { apiFetch } from './client';
import type { WatchlistItemDto } from './dto';

/**
 * Customer watchlist — backend `/watchlist` router.
 *
 * Saves a model (with optional trim/colour) so the customer can track it.
 * Uniqueness is per model name for the signed-in user.
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
  list: () => apiFetch<WatchlistItemDto[]>('/watchlist'),
  add: (body: WatchlistCreateBody) =>
    apiFetch<WatchlistItemDto>('/watchlist', { method: 'POST', body }),
  update: (itemId: string, body: WatchlistUpdateBody) =>
    apiFetch<WatchlistItemDto>(`/watchlist/${itemId}`, { method: 'PATCH', body }),
  remove: (itemId: string) =>
    apiFetch<void>(`/watchlist/${itemId}`, { method: 'DELETE' }),
};
