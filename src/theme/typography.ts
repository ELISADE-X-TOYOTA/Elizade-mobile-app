import { Platform, TextStyle } from 'react-native';

/**
 * Elizade typography — the Outfit family app-wide.
 *
 * Names match the @expo-google-fonts/outfit exports loaded in app/_layout.tsx.
 * Weights: Regular 400, Medium 500, SemiBold 600, Bold 700.
 *
 * Fallbacks: React Native's `fontFamily` takes a single family (no CSS-style
 * stacks). If the Outfit assets fail to download/parse we swap the whole scale
 * to the platform system face via `makeType(false)` so text always renders —
 * never invisible, never a blocked splash.
 */

/** Platform system faces used when Outfit is unavailable. */
export const SYSTEM_FALLBACK = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
}) as string;

export const fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semiBold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
} as const;

/** Weight roles → the family used for each, per load state. */
type Role = keyof typeof fonts;

function family(role: Role, ready: boolean): string {
  return ready ? fonts[role] : SYSTEM_FALLBACK;
}

/**
 * Builds the type scale. `ready = false` renders the same metrics with the
 * system face, so a font failure degrades gracefully instead of breaking text.
 */
export function makeType(ready: boolean) {
  const f = (role: Role) => family(role, ready);
  return {
    displayLarge: { fontFamily: f('bold'), fontSize: 40, lineHeight: 46, letterSpacing: -1 },
    displayMedium: { fontFamily: f('bold'), fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
    headlineLarge: { fontFamily: f('bold'), fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
    headlineMedium: { fontFamily: f('bold'), fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
    headlineSmall: { fontFamily: f('bold'), fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
    titleLarge: { fontFamily: f('semiBold'), fontSize: 18, lineHeight: 24, letterSpacing: -0.1 },
    titleMedium: { fontFamily: f('semiBold'), fontSize: 16, lineHeight: 22 },
    titleSmall: { fontFamily: f('semiBold'), fontSize: 14, lineHeight: 20 },
    bodyLarge: { fontFamily: f('regular'), fontSize: 16, lineHeight: 24 },
    bodyMedium: { fontFamily: f('regular'), fontSize: 14, lineHeight: 21 },
    bodySmall: { fontFamily: f('regular'), fontSize: 12, lineHeight: 17 },
    labelLarge: { fontFamily: f('semiBold'), fontSize: 15, letterSpacing: 0.2 },
    labelMedium: { fontFamily: f('medium'), fontSize: 13 },
    labelSmall: { fontFamily: f('medium'), fontSize: 11, letterSpacing: 0.4 },
  } satisfies Record<string, TextStyle>;
}

/** Outfit scale — the default. Consumers normally read this via `useTheme()`. */
export const type = makeType(true);

/** System-face scale used while fonts load or if they fail. */
export const systemType = makeType(false);

export type TypeVariant = keyof typeof type;
