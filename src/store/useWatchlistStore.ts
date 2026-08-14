import { create } from 'zustand';
import { ApiError } from '../api/client';
import {
  addWatchlistItem,
  listWatchlist,
  removeWatchlistItem,
  updateWatchlistItem,
} from '../data/watchlistRepository';
import { Vehicle, WatchlistItem } from '../domain/types';

interface WatchlistState {
  items: WatchlistItem[];
  loading: boolean;
  error?: string;
  /** Load (or refresh) the signed-in customer's watchlist. */
  load: () => Promise<void>;
  clear: () => void;
  /** True when this model name is already saved. */
  isWatchingModel: (model: string) => boolean;
  findByModel: (model: string) => WatchlistItem | undefined;
  /** Add from a catalogue vehicle (model + trim + colour). */
  addVehicle: (vehicle: Pick<Vehicle, 'model' | 'trim' | 'color'>) => Promise<void>;
  /** Remove by watchlist item id. */
  remove: (itemId: string) => Promise<void>;
  /** Toggle heart for a vehicle — add or remove by model. */
  toggleVehicle: (vehicle: Pick<Vehicle, 'model' | 'trim' | 'color'>) => Promise<void>;
  /** Update trim / colour preferences. */
  update: (
    itemId: string,
    patch: { trim?: string | null; color?: string | null },
  ) => Promise<void>;
}

/**
 * Server-backed watchlist. Not persisted — loaded after login so hearts stay
 * in sync with GET/POST/PATCH/DELETE /watchlist.
 */
export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  items: [],
  loading: false,
  error: undefined,

  load: async () => {
    set({ loading: true, error: undefined });
    try {
      const items = await listWatchlist();
      set({ items, loading: false });
    } catch (e) {
      set({
        items: [],
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load watchlist',
      });
    }
  },

  clear: () => set({ items: [], error: undefined, loading: false }),

  isWatchingModel: (model) => get().items.some((i) => i.model === model),

  findByModel: (model) => get().items.find((i) => i.model === model),

  addVehicle: async (vehicle) => {
    try {
      const item = await addWatchlistItem({
        model: vehicle.model,
        trim: vehicle.trim,
        color: vehicle.color,
      });
      set((s) => ({
        items: [item, ...s.items.filter((i) => i.model !== item.model)],
        error: undefined,
      }));
    } catch (e) {
      // Already saved — refresh so local state matches the server.
      if (e instanceof ApiError && e.status === 409) {
        await get().load();
        return;
      }
      throw e;
    }
  },

  remove: async (itemId) => {
    await removeWatchlistItem(itemId);
    set((s) => ({ items: s.items.filter((i) => i.id !== itemId) }));
  },

  toggleVehicle: async (vehicle) => {
    const existing = get().findByModel(vehicle.model);
    if (existing) {
      await get().remove(existing.id);
      return;
    }
    await get().addVehicle(vehicle);
  },

  update: async (itemId, patch) => {
    const item = await updateWatchlistItem(itemId, patch);
    set((s) => ({
      items: s.items.map((i) => (i.id === itemId ? item : i)).filter((i) => i.isActive),
    }));
  },
}));
