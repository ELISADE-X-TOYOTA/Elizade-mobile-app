import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import type { AppColors } from './colors';

/**
 * Bridges our palette into React Navigation's theme.
 *
 * WHY THIS IS NEEDED: nothing was providing a navigation theme, so every
 * navigator fell back to `DefaultTheme` — whose background is
 * `rgb(242, 242, 242)`, a light grey. The root Stack overrode it with a
 * transparent `contentStyle`, which hid the problem there, but any navigator
 * that did NOT set one (the bottom tabs) painted that grey behind the screen.
 * In dark mode that is a pale slab flashing behind a near-black app during
 * transitions — the "white background leak" that gets reported.
 *
 * Setting it here fixes the whole class of bug rather than one navigator:
 * anything added later inherits a correctly themed default instead of a light
 * one that has to be remembered and overridden.
 *
 * `background` is `canvas`, not `background`: canvas is the recessed page
 * backdrop the whole app sits on, so a navigator that paints its own
 * container matches the wallpaper view beneath it exactly.
 */
export function buildNavigationTheme(colors: AppColors, isDark: boolean): Theme {
  const base = isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: isDark,
    colors: {
      ...base.colors,
      primary: colors.accentText,
      background: colors.canvas,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.errorText,
    },
  };
}
