import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Path, Pattern, Rect } from 'react-native-svg';
import { PATTERN_YELLOW } from '../theme/colors';
import { useTheme } from '../theme/useTheme';

/**
 * Automotive doodle wallpaper — the WhatsApp/Telegram chat-background idea,
 * drawn from Elizade's world: cars, steering wheels, keys, pistons, gauges,
 * fuel pumps, tyres and the Elizade monogram.
 *
 * WHY SVG `<Pattern>`: the tile is defined once in `<Defs>` and stamped by the
 * renderer across a single `<Rect>`. That means one native view regardless of
 * screen size, true seamless repetition, and vector crispness at every pixel
 * density — no bitmap, no re-tiling maths, no pixelation on tablets.
 *
 * Everything is stroke-only line art with no fills, kept at low opacity so
 * foreground text and controls stay fully legible.
 */

/** Icons are authored on a 24×24 grid, then placed/scaled inside the tile. */
interface Doodle {
  /** Stroked paths. */
  d: string[];
  /** Stroked circles: [cx, cy, r]. */
  circles?: [number, number, number][];
}

const CAR: Doodle = {
  d: [
    'M3 15v-2.2c0-.6.3-1.1.8-1.4l2.6-1.5.9-2.1c.3-.7 1-1.1 1.8-1.1h5.2c.7 0 1.3.4 1.7 1l1.3 2.3 2.1.7c.6.2 1 .8 1 1.4V15c0 .6-.4 1-1 1h-1',
    'M5 16H4a1 1 0 0 1-1-1',
    'M10 16h4',
  ],
  circles: [
    [7.5, 16, 2],
    [16.5, 16, 2],
  ],
};

const STEERING_WHEEL: Doodle = {
  d: ['M12 9V3.2', 'M9.4 13.5 4.4 16.4', 'M14.6 13.5l5 2.9'],
  circles: [
    [12, 12, 9],
    [12, 12, 3.1],
  ],
};

const KEY: Doodle = {
  d: ['M11 12h9.5', 'M16.5 12v3.2', 'M19.5 12v2.4'],
  circles: [[7, 12, 4]],
};

const PISTON: Doodle = {
  d: [
    'M8.2 4.5h7.6v5.6H8.2z',
    'M8.2 6.4h7.6',
    'M8.2 8.2h7.6',
    'M12 10.1v4.4',
  ],
  circles: [[12, 17, 2.6]],
};

const SPEEDOMETER: Doodle = {
  d: ['M3.6 16.5a8.4 8.4 0 1 1 16.8 0', 'M12 16.5l4.2-4.2', 'M5.6 11.2l1.3 1', 'M18.4 11.2l-1.3 1'],
  circles: [[12, 16.5, 1.1]],
};

const FUEL_PUMP: Doodle = {
  d: [
    'M4.5 20V6.2A2.2 2.2 0 0 1 6.7 4h4.6a2.2 2.2 0 0 1 2.2 2.2V20',
    'M3.2 20h11.6',
    'M6.8 7.2h4.4v3.2H6.8z',
    'M13.5 9.4h2.9a1.8 1.8 0 0 1 1.8 1.8v4.6a1.4 1.4 0 0 0 2.8 0V10l-1.9-1.9',
  ],
};

const TYRE: Doodle = {
  d: ['M12 3v3.4', 'M12 17.6V21', 'M3 12h3.4', 'M17.6 12H21'],
  circles: [
    [12, 12, 9],
    [12, 12, 4.2],
  ],
};

const HEADLIGHT: Doodle = {
  d: [
    // Modern LED housing: flat at the back, domed toward the beam.
    'M12.4 5.6a6.4 6.4 0 0 1 0 12.8H5.1a1.7 1.7 0 0 1-1.7-1.7V7.3a1.7 1.7 0 0 1 1.7-1.7z',
    'M17.4 9.2h3.4',
    'M17.9 12h3.9',
    'M17.4 14.8h3.4',
  ],
};

const GEAR_SHIFT: Doodle = {
  // The classic H-gate shift pattern.
  d: ['M6.5 8.4v9.2', 'M17.5 8.4v9.2', 'M6.5 13h11', 'M12 13V7.6'],
  circles: [[12, 5.6, 1.7]],
};

const ROAD: Doodle = {
  // Perspective road with a dashed centre line.
  d: ['M7.6 3.5 4.2 20.5', 'M16.4 3.5l3.4 17', 'M12 5.2v2.9', 'M12 10.6v2.9', 'M12 16v2.9'],
};

/**
 * Elizade monogram: an "E" in a rounded badge.
 *
 * NOTE: this is our own mark, drawn as line art. Third-party marques (Toyota,
 * Jetour, JAC) are deliberately NOT reproduced here — see BRAND_MARKS below.
 */
const ELIZADE_E: Doodle = {
  d: [
    'M5.5 4.5h13a1.8 1.8 0 0 1 1.8 1.8v11.4a1.8 1.8 0 0 1-1.8 1.8h-13a1.8 1.8 0 0 1-1.8-1.8V6.3a1.8 1.8 0 0 1 1.8-1.8z',
    'M9.2 8h5.6',
    'M9.2 12h4.6',
    'M9.2 16h5.6',
    'M9.2 8v8',
  ],
};

/** Placement inside the tile: [icon, x, y, scale, rotation°]. */
type Placement = [Doodle, number, number, number, number];

/**
 * Tile layout. Positions are hand-scattered with varied rotation and scale so
 * the repeat reads as texture rather than a grid. Every glyph sits fully
 * inside the tile, so nothing clips at the seam.
 */
const TILE = 264;

/**
 * BRAND MARKS — intentionally empty.
 *
 * Toyota, Jetour and JAC emblems are third-party registered trademarks. Elizade
 * is an authorised distributor, but distributor agreements govern *how* those
 * marks may be used, and decorative tiling across an app background is
 * precisely the kind of use they normally restrict. Separately, redrawing a
 * marque from memory would produce an inaccurate mark, which is its own problem.
 *
 * TO ADD THEM, once brand approval is in hand: paste the official path data
 * from each brand kit as a `Doodle` (authored on the same 24×24 grid) and add
 * a `Placement` entry here. Nothing else needs to change — they inherit the
 * stroke, opacity and tiling automatically.
 */
const BRAND_MARK_PLACEMENTS: Placement[] = [];

/**
 * Glyphs sit well inside the tile edges on purpose. `<Pattern>` CLIPS its
 * contents, so a glyph overlapping the boundary is sliced in half and the cut
 * repeats across the screen as a visible grid line — the exact artifact the
 * scattered layout exists to avoid. Rotation widens a glyph's footprint
 * (a 24-unit square at 40° spans ~34), so the margins account for that too.
 */
const PLACEMENTS: Placement[] = [
  // Balanced 4/4/3/3 across the tile's quadrants. Even spread matters as much
  // as the scatter itself: clumping leaves bald patches that read as structure
  // once the tile repeats, which is the thing a "random" wallpaper must not do.
  [CAR, 12, 16, 1.15, -8],
  [KEY, 70, 40, 0.9, -22],
  [PISTON, 18, 90, 0.95, 14],
  [ROAD, 92, 100, 0.9, 10],

  [STEERING_WHEEL, 146, 10, 0.95, 12],
  [HEADLIGHT, 212, 30, 0.9, -14],
  [SPEEDOMETER, 150, 74, 1.0, -6],
  [TYRE, 214, 104, 1.0, 0],

  [ELIZADE_E, 40, 140, 0.9, 8],
  [FUEL_PUMP, 22, 196, 0.95, -12],
  [KEY, 104, 206, 0.7, 40],

  [GEAR_SHIFT, 150, 146, 0.85, -16],
  [HEADLIGHT, 226, 186, 0.62, 22],
  [STEERING_WHEEL, 160, 208, 0.72, -18],

  ...BRAND_MARK_PLACEMENTS,
];

function renderDoodle(icon: Doodle, key: string, x: number, y: number, scale: number, rotate: number) {
  // Rotate about the glyph's own centre (12,12 on the authoring grid).
  const transform = `translate(${x}, ${y}) scale(${scale}) rotate(${rotate}, 12, 12)`;
  return (
    <G key={key} transform={transform}>
      {icon.d.map((d, i) => (
        <Path key={i} d={d} />
      ))}
      {icon.circles?.map(([cx, cy, r], i) => (
        <Circle key={`c${i}`} cx={cx} cy={cy} r={r} />
      ))}
    </G>
  );
}

interface Props {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Line opacity. Defaults are tuned per theme; override for a screen that
   * needs the texture pushed further back (or brought forward on a hero).
   */
  opacity?: number;
  /** Stroke colour override; defaults to the fixed brand yellow. */
  color?: string;
  /** Render only the pattern layer, for use as an absolute backdrop. */
  absolute?: boolean;
}

export function PatternBackground({ children, style, opacity, color, absolute }: Props) {
  const t = useTheme();

  /**
   * Brand yellow in BOTH themes — the wallpaper is a fixed brand asset, so it
   * deliberately does not invert with the colour scheme.
   *
   * Opacity still differs per theme, because identical alpha does not read as
   * identical weight: yellow on near-black is high-contrast and needs holding
   * back, while the same yellow on white is low-contrast and needs more to
   * register at all. These are matched *perceptual* weights, not equal values.
   *
   * Legibility is protected structurally too: cards, sheets, modals and the
   * tab bar are opaque `surface`, so body text never sits on the pattern — it
   * only shows through the screen backdrop and gutters.
   *
   * Where text DOES sit on the backdrop (screen headings), the worst case is a
   * stroke directly behind it. Measured at these values: 12.6:1 for primary and
   * 5.8:1 for secondary on dark, 14.9:1 and 5.1:1 on light. Headroom runs out
   * around 25% on dark, where secondary reaches 4.73:1 — so treat that as the
   * ceiling, not a target.
   */
  const lineOpacity = opacity ?? (t.isDark ? 0.18 : 0.22);
  const stroke = color ?? PATTERN_YELLOW;

  const layer = (
    <Svg
      style={StyleSheet.absoluteFill}
      // Non-interactive decoration: never intercept touches or announce itself.
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Defs>
        <Pattern
          id="elizade-doodles"
          // userSpaceOnUse + a fixed tile = a seam-free repeat at any size.
          patternUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={TILE}
          height={TILE}
        >
          <G
            stroke={stroke}
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={lineOpacity}
          >
            {PLACEMENTS.map(([icon, x, y, scale, rotate], i) =>
              renderDoodle(icon, `p${i}`, x, y, scale, rotate),
            )}
          </G>
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill="url(#elizade-doodles)" />
    </Svg>
  );

  if (absolute) return layer;

  return (
    <View style={[styles.root, style]}>
      {layer}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
