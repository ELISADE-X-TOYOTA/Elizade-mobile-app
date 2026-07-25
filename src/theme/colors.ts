/**
 * Elizade brand color system — a black + yellow identity.
 *   Light theme  = white surfaces, near-black text/structure, yellow accent.
 *   Dark theme   = near-black surfaces, light text/structure, yellow accent.
 * Yellow (#F5B301) is the single accent in both modes; everything else is
 * monochrome so the brand yellow always pops.
 */

export const brand = {
  accent: '#F5B301', // Elizade gold-yellow
  accentDark: '#D89A00',
  onAccent: '#1E1B00', // dark text/icons on the yellow accent
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

/** Yellow accent gradient — identical in both themes. */
export const gradients = {
  accent: ['#F5B301', '#E0A000'] as const,
};

const light = {
  ...brand,
  primary: '#141A21', // near-black structural / interactive color
  primaryDark: '#000000',
  primaryLight: '#3A424D',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F6F8',
  border: '#E6E9EE',
  textPrimary: '#141A21',
  textSecondary: '#5C6470',
  textTertiary: '#9AA1AC',
  onPrimary: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.06)',
};

const dark: typeof light = {
  ...brand,
  primary: '#F4F6F8', // light structural color on black
  primaryDark: '#000000',
  primaryLight: '#C9CFD6',
  background: '#0A0A0B',
  surface: '#141416',
  surfaceAlt: '#1C1C20',
  border: '#2A2A30',
  textPrimary: '#F4F6F8',
  textSecondary: '#A3AAB5',
  textTertiary: '#6B7280',
  onPrimary: '#0A0A0B',
  overlay: 'rgba(255,255,255,0.07)',
};

export type AppColors = typeof light;

export const palette = { light, dark };
