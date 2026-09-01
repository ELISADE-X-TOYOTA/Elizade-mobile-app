import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * App Lock preference and runtime lock state.
 *
 * The PREFERENCE is persisted in AsyncStorage — it is a setting, not a secret,
 * and the credentials it guards live in the keystore regardless. The LOCK
 * ITSELF is not persisted: a locked app that came back unlocked after a restart
 * would be theatre, and one that came back locked with no way to reach the
 * setting would be a trap. It is recomputed from the policy on every launch.
 */
interface SecurityState {
  /** Customer's choice. Off by default — never switched on behind their back. */
  appLockEnabled: boolean;
  setAppLockEnabled: (enabled: boolean) => void;

  /**
   * Whether we have offered App Lock after sign-in. Once only: a security
   * prompt that reappears every launch gets dismissed reflexively, which is
   * worse than not asking.
   */
  enrollmentOffered: boolean;
  markEnrollmentOffered: () => void;

  /** Runtime only. True while the lock overlay should cover the app. */
  locked: boolean;
  setLocked: (locked: boolean) => void;

  /** Runtime only. When the app last went to the background. */
  backgroundedAt: number | null;
  setBackgroundedAt: (at: number | null) => void;
}

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set) => ({
      appLockEnabled: false,
      setAppLockEnabled: (appLockEnabled) => set({ appLockEnabled }),

      enrollmentOffered: false,
      markEnrollmentOffered: () => set({ enrollmentOffered: true }),

      locked: false,
      setLocked: (locked) => set({ locked }),

      backgroundedAt: null,
      setBackgroundedAt: (backgroundedAt) => set({ backgroundedAt }),
    }),
    {
      name: 'elizade-security',
      storage: createJSONStorage(() => AsyncStorage),
      // `locked` and `backgroundedAt` are deliberately absent — see above.
      partialize: (s) => ({
        appLockEnabled: s.appLockEnabled,
        enrollmentOffered: s.enrollmentOffered,
      }),
    },
  ),
);
