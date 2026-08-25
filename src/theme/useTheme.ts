import { useColorScheme } from 'react-native';
import { useStore } from '../store/useStore';
import { AppColors, palette } from './colors';
import { radius, spacing } from './spacing';
import { shadows } from './shadows';
import { systemType, type } from './typography';

/** Theme-aware gradients. `accent` (yellow) is constant; `primary` (dark
 *  structural) and `hero` (neutral header) flip with light/dark. */
export interface Gradients {
  accent: readonly [string, string];
  primary: readonly [string, string];
  hero: readonly [string, string];
}

export interface Theme {
  colors: AppColors;
  isDark: boolean;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  type: typeof type;
  gradients: Gradients;
}

/**
 * Resolves the active palette from the device's appearance setting.
 *
 * There is deliberately no in-app override. The OS already owns this
 * preference — including its schedule, so a phone that turns dark at sunset
 * takes the app with it — and a second switch inside the app can only
 * disagree with the one the user already set. `useColorScheme` re-renders on
 * change, so switching the system theme updates every screen live.
 */
export function useTheme(): Theme {
  const fontsReady = useStore((s) => s.fontsReady);
  const isDark = useColorScheme() === 'dark';
  const gradients: Gradients = {
    accent: ['#F5B301', '#E0A000'],
    primary: isDark ? ['#33333A', '#1C1C20'] : ['#20262E', '#0C1116'],
    hero: isDark ? ['#141416', '#0A0A0B'] : ['#FFFFFF', '#F5F6F8'],
  };
  return {
    colors: isDark ? palette.dark : palette.light,
    isDark,
    spacing,
    radius,
    shadows,
    // Outfit once loaded; system face until then (or if loading failed).
    type: fontsReady ? type : systemType,
    gradients,
  };
}
