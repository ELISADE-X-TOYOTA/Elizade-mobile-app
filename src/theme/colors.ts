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
/**
 * Wallpaper stroke colour. Brighter than the brand gold so the line art reads
 * as a vivid accent, and intentionally FIXED across light and dark — the
 * pattern is a brand asset, not a themed surface.
 */
export const PATTERN_YELLOW = '#FFCC00';

/**
 * Chips that float on top of vehicle photography (category badge, favourite
 * heart, back button over a hero image).
 *
 * These are deliberately theme-FIXED. A photo is not a themed surface — it can
 * be a white Corolla or a black Land Cruiser regardless of the user's colour
 * scheme — so inverting the chip in dark mode would make it vanish against
 * exactly the images a dark chip is worst at. A light chip with dark ink is
 * legible on any photograph, so both halves are pinned together: pairing a
 * fixed chip with a *themed* ink is what produced the dark-mode bug where the
 * unfilled heart went pale grey on white.
 */
export const OVERLAY_CHIP = 'rgba(255,255,255,0.92)';
export const OVERLAY_CHIP_INK = '#141A21';

/**
 * Ink for content sitting on an ALWAYS-DARK surface — the warranty certificate,
 * the dashboard hero panel, the primary-gradient button, chips over photography.
 *
 * Theme-fixed on purpose: those surfaces are dark in light mode too, so themed
 * text would invert to near-black on near-black. Use this instead of a raw
 * '#fff' so the intent is greppable and there is one place to change it —
 * a bare literal reads like an oversight and gets "helpfully" tokenised later.
 *
 * NOT for normal surfaces. If the background comes from `t.colors.surface`,
 * the text belongs to `t.colors.textPrimary`.
 */
export const ON_DARK_INK = '#FFFFFF';

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
  /**
   * The recessed page backdrop that cards float on (see `dark.canvas`).
   * In light mode that is the grey wash — white cards lift off it.
   */
  canvas: '#F5F6F8',
  /**
   * Accent-toned INLINE TEXT (links/CTAs inside a sentence).
   *
   * Not `accent`: the brand gold #F5B301 is 1.85:1 on white — unreadable as
   * type. Yellow earns its contrast on dark and loses it on light, so this
   * token deepens to bronze here (5.07:1 on surfaceAlt) while reading as the
   * same warm brand hue. `accent` stays correct for FILLS, where the dark
   * `onAccent` ink supplies the contrast.
   */
  accentText: '#8A6206',
  /**
   * Status colours as TEXT. The `brand` values above are tuned to be seen as
   * FILLS and icons; used as type they fail badly — plain `success` (#22C55E)
   * is 2.03:1 on white, effectively unreadable, and the common
   * `colour + '22'` badge tint makes it marginally worse rather than better.
   * These are the same hues pushed to where they clear 4.5:1 on that badge.
   */
  successText: '#166534',
  warningText: '#92400E',
  errorText: '#B91C1C',
  infoText: '#1D4ED8',
  border: '#DFE3EA',
  textPrimary: '#141A21',
  textSecondary: '#5C6470',
  // Tertiary is real copy (captions, placeholders, meta rows), so it is held to
  // the 4.5:1 body-text bar against the *worst* background it lands on —
  // surfaceAlt, not just white. The old #9AA1AC was 2.41:1 there and failed.
  textTertiary: '#666D79',
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
  /**
   * Dark mode gets its elevation from surface LIGHTNESS, not shadows — our
   * shadows are near-black (`shadows.ts`) and simply vanish on a near-black
   * page. So the backdrop must be the darkest layer and cards step *up* from it.
   *
   * This is why it is not `surfaceAlt`: in dark mode surfaceAlt (#1C1C20) is
   * lighter than surface (#141416), so using it as the page backdrop inverted
   * the hierarchy and made every card look sunken rather than raised.
   */
  canvas: '#0A0A0B',
  // On dark the brand gold is already 10.7:1 — no adjustment needed.
  accentText: '#F5B301',
  // Success and warning already clear the bar on a dark card; red and blue do
  // not (4.31:1 and 4.29:1 on their own badge tint), so both are lightened.
  successText: '#22C55E',
  warningText: '#F59E0B',
  errorText: '#F87171',
  infoText: '#60A5FA',
  // Lifted from #2A2A30 (1.29:1 — effectively invisible). Dark mode has no
  // shadows to separate a card from its backdrop, so the border is the *only*
  // thing defining a card edge and it has to actually be seen.
  border: '#33333B',
  textPrimary: '#F4F6F8',
  textSecondary: '#A3AAB5',
  // Was #6B7280 → 3.51:1 on surfaceAlt, under the 4.5:1 body-text bar.
  textTertiary: '#7C8695',
  onPrimary: '#0A0A0B',
  overlay: 'rgba(255,255,255,0.07)',
};

export type AppColors = typeof light;

export const palette = { light, dark };
