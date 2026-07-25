import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { UserProfile, VehicleCategory } from '../domain/types';

export type ThemeMode = 'light' | 'dark' | 'system';

interface AppState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  /**
   * True once the Outfit family is available. Never persisted — fonts must be
   * re-loaded each launch. While false the theme serves the system-face scale
   * so text still renders if the assets fail.
   */
  fontsReady: boolean;
  setFontsReady: (ready: boolean) => void;

  /** The signed-in user (null when using mock display or logged out). */
  currentUser: UserProfile | null;
  setCurrentUser: (u: UserProfile | null) => void;

  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;

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
      partialize: (s) => ({ themeMode: s.themeMode, favorites: s.favorites }),
    },
  ),
);
