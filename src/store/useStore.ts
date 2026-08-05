import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { UserProfile, Vehicle, VehicleCategory, vehicleTitle } from '../domain/types';

export type ThemeMode = 'light' | 'dark' | 'system';

/** Side-by-side comparison holds exactly two vehicles. */
export const COMPARE_LIMIT = 2;

/** The minimum a vehicle needs to render in the comparison tray. */
export interface CompareEntry {
  id: string;
  title: string;
  trim: string;
  image: string;
  price: number;
}

/**
 * What `toggleCompare` did, so the caller can give the right feedback.
 * `swapped` carries the title of the vehicle that was displaced.
 */
export type CompareResult =
  | { action: 'added'; count: number }
  | { action: 'removed'; count: number }
  | { action: 'swapped'; count: number; replaced: string };

const entryOf = (v: Vehicle): CompareEntry => ({
  id: v.id,
  title: vehicleTitle(v),
  trim: v.trim,
  image: v.images?.[0] ?? '',
  price: v.price,
});

interface AppState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  /**
   * True once the Outfit family is available. Never persisted — fonts must be
   * re-loaded each launch. While false the theme serves the system-face scale
   * so text still renders if the assets fail.
   */
  /**
   * Per-account set of user ids that have finished the dashboard tour.
   * Keyed by id (not a single boolean) so a second account on the same device
   * still gets its own walkthrough. Persisted.
   */
  onboardedUserIds: string[];
  hasCompletedOnboarding: (userId: string) => boolean;
  completeOnboarding: (userId: string) => void;

  /**
   * Ids of locally-generated notifications (currently the first-login welcome)
   * the user has already read. The backend has no customer-facing create
   * endpoint, so this one lives on the device. Persisted.
   */
  readLocalNotificationIds: string[];
  markLocalNotificationRead: (id: string) => void;

  fontsReady: boolean;
  setFontsReady: (ready: boolean) => void;

  /** The signed-in user (null when using mock display or logged out). */
  currentUser: UserProfile | null;
  setCurrentUser: (u: UserProfile | null) => void;

  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;

  /**
   * Vehicles staged for side-by-side comparison, max {@link COMPARE_LIMIT}.
   *
   * Lightweight snapshots rather than ids: the tray has to render a thumbnail
   * and title the instant a card is tapped, and the card already holds that
   * data. Storing ids alone would mean a network round-trip just to label the
   * dock. The compare SCREEN still re-fetches full details, because list
   * payloads carry no engine or specs.
   *
   * Deliberately NOT persisted — a stale comparison resurrected days later is
   * noise, and prices/availability would be out of date.
   */
  compare: CompareEntry[];
  /** Adds, removes if already staged, or swaps out the challenger when full. */
  toggleCompare: (v: Vehicle) => CompareResult;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  isComparing: (id: string) => boolean;
  /**
   * Title of the vehicle a swap just displaced, shown briefly in the tray.
   * Replacing a car the user picked should never happen silently — without
   * this they could open the comparison to find a vehicle they didn't choose.
   */
  swapNotice: string | null;
  dismissSwapNotice: () => void;

  categoryFilter: VehicleCategory | null;
  setCategoryFilter: (c: VehicleCategory | null) => void;

  marketTab: 0 | 1 | 2;
  setMarketTab: (t: 0 | 1 | 2) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      themeMode: 'light',
      setThemeMode: (themeMode) => set({ themeMode }),

      readLocalNotificationIds: [],
      markLocalNotificationRead: (id) =>
        set((s) =>
          s.readLocalNotificationIds.includes(id)
            ? s
            : { readLocalNotificationIds: [...s.readLocalNotificationIds, id] },
        ),

      onboardedUserIds: [],
      hasCompletedOnboarding: (userId) => get().onboardedUserIds.includes(userId),
      completeOnboarding: (userId) =>
        set((s) =>
          s.onboardedUserIds.includes(userId)
            ? s
            : { onboardedUserIds: [...s.onboardedUserIds, userId] },
        ),

      fontsReady: false,
      setFontsReady: (fontsReady) => set({ fontsReady }),

      currentUser: null,
      setCurrentUser: (currentUser) => set({ currentUser }),

      favorites: ['v2'],
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((f) => f !== id)
            : [...s.favorites, id],
        })),
      isFavorite: (id) => get().favorites.includes(id),

      compare: [],
      toggleCompare: (vehicle) => {
        const current = get().compare;
        const existing = current.find((c) => c.id === vehicle.id);
        if (existing) {
          const next = current.filter((c) => c.id !== vehicle.id);
          set({ compare: next, swapNotice: null });
          return { action: 'removed', count: next.length };
        }
        if (current.length < COMPARE_LIMIT) {
          const next = [...current, entryOf(vehicle)];
          set({ compare: next, swapNotice: null });
          return { action: 'added', count: next.length };
        }
        // At the limit, replace the most recent pick and keep the first as the
        // anchor. Tapping a third car is never a dead end this way, which is
        // what "easy swap" needs — and the tray's per-slot remove buttons stay
        // available for anyone who wants to drop the anchor instead.
        const replaced = current[COMPARE_LIMIT - 1];
        const next = [...current.slice(0, COMPARE_LIMIT - 1), entryOf(vehicle)];
        set({ compare: next, swapNotice: replaced.title });
        return { action: 'swapped', count: next.length, replaced: replaced.title };
      },
      removeFromCompare: (id) =>
        set((s) => ({ compare: s.compare.filter((c) => c.id !== id), swapNotice: null })),
      clearCompare: () => set({ compare: [], swapNotice: null }),
      swapNotice: null,
      dismissSwapNotice: () => set({ swapNotice: null }),
      isComparing: (id) => get().compare.some((c) => c.id === id),

      categoryFilter: null,
      setCategoryFilter: (categoryFilter) => set({ categoryFilter }),

      marketTab: 0,
      setMarketTab: (marketTab) => set({ marketTab }),
    }),
    {
      // Bumped to -v2 so devices that already persisted the old dark/system
      // default reset to the new light theme.
      name: 'elizade-store-v2',
      storage: createJSONStorage(() => AsyncStorage),
      // SECURITY: only non-sensitive preferences are persisted. `currentUser`
      // holds PII (email, phone) and is deliberately excluded — AsyncStorage is
      // unencrypted. The profile is re-fetched from /auth/me using the token in
      // SecureStore, so nothing is lost across restarts.
      partialize: (s) => ({
        themeMode: s.themeMode,
        favorites: s.favorites,
        onboardedUserIds: s.onboardedUserIds,
        readLocalNotificationIds: s.readLocalNotificationIds,
      }),
    },
  ),
);
