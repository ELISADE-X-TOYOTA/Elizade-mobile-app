import { Vehicle } from './types';
import { mileage as fmtMileage, price as fmtPrice } from '../utils/format';

/**
 * Builds the side-by-side spec matrix for the vehicle comparison screen.
 *
 * Pure and UI-free so the row/diff logic can be reasoned about (and tested)
 * without mounting a screen.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS ONLY READS `vehicle.specs` AND THE REAL API COLUMNS
 *
 * `Vehicle.seats` and `Vehicle.horsepower` are NOT real data — `api/mappers.ts`
 * synthesises them from a per-category lookup table, so every SUV reports 7
 * seats / 270 hp regardless of the actual vehicle. Rendering those in a
 * comparison would invent differences that don't exist, or worse, hide real
 * ones behind matching fake numbers. A buyer comparing two cars is exactly the
 * person who must not be shown fabricated figures, so this module ignores those
 * fields entirely and sources capacity/power from the backend `specs` bag.
 */

/** A single spec line, resolved for both vehicles. */
export interface CompareRow {
  label: string;
  /** Display value for the left/right vehicle; `null` when not published. */
  a: string | null;
  b: string | null;
  /**
   * True only when both sides are known AND unequal. A missing value is an
   * absence of information, not a difference — see `comparable`.
   */
  differs: boolean;
  /** Both sides present, so the row can honestly be called same-or-different. */
  comparable: boolean;
}

export interface CompareGroup {
  title: string;
  /** Ionicons name. */
  icon: string;
  rows: CompareRow[];
}

export interface Comparison {
  groups: CompareGroup[];
  /** Rows where both values are known and differ. */
  differenceCount: number;
  /** Rows where at least one side has no published value. */
  unknownCount: number;
  totalRows: number;
}

/**
 * Spec-bag key aliases. The backend column is free-form JSONB, so the same
 * attribute arrives spelled differently depending on who seeded the record.
 * Matching is case- and separator-insensitive.
 */
const ALIASES: Record<string, string[]> = {
  seating: ['seating', 'seating capacity', 'seats', 'passenger capacity'],
  cargo: ['cargo space', 'cargo volume', 'boot space', 'luggage capacity', 'trunk capacity'],
  power: ['horsepower', 'power', 'max power', 'engine power', 'bhp'],
  torque: ['torque', 'max torque'],
  economy: ['fuel economy', 'fuel consumption', 'economy', 'range', 'efficiency'],
  tank: ['fuel tank', 'tank capacity', 'battery capacity'],
  drivetrain: ['drivetrain', 'drive type', 'drive'],
  acceleration: ['acceleration', '0-100', '0-100 km/h'],
  topSpeed: ['top speed', 'max speed'],
  infotainment: ['infotainment', 'display', 'touchscreen', 'screen'],
  safety: ['safety', 'safety features', 'safety system'],
  assistance: ['driver assistance', 'driver assist', 'adas', 'assistance'],
  audio: ['audio', 'sound system', 'speakers'],
  warranty: ['warranty'],
  dimensions: ['dimensions', 'length', 'wheelbase'],
  groundClearance: ['ground clearance', 'clearance'],
};

const norm = (s: string) => s.toLowerCase().replace(/[_\-\s]+/g, ' ').trim();

/** Every alias that is claimed by a named row, for the leftovers sweep below. */
const CLAIMED = new Set(Object.values(ALIASES).flat());

/** Look a spec up by alias group, tolerating key-spelling drift. */
function spec(v: Vehicle, group: keyof typeof ALIASES): string | null {
  const wanted = ALIASES[group];
  for (const [key, value] of Object.entries(v.specs ?? {})) {
    if (wanted.includes(norm(key))) {
      const trimmed = String(value).trim();
      return trimmed === '' ? null : trimmed;
    }
  }
  return null;
}

/** Treat empty strings, placeholder dashes and nullish values as "unknown". */
function real(value: string | number | null | undefined): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === '' || s === '—' || s === '-' || s === 'N/A') return null;
  return s;
}

function row(label: string, a: string | null, b: string | null): CompareRow {
  const comparable = a !== null && b !== null;
  return {
    label,
    a,
    b,
    comparable,
    // Compare case-insensitively so "CVT" and "cvt" aren't a false difference.
    differs: comparable && norm(a!) !== norm(b!),
  };
}

/**
 * Spec keys present on either vehicle that no named row already covers.
 *
 * Without this, any attribute the dealership adds to the JSONB bag would be
 * silently invisible in the comparison. Surfacing leftovers means the screen
 * grows with the data instead of needing a code change per new spec.
 */
function extraRows(a: Vehicle, b: Vehicle): CompareRow[] {
  const keys = new Set<string>();
  for (const v of [a, b]) {
    for (const k of Object.keys(v.specs ?? {})) {
      if (!CLAIMED.has(norm(k))) keys.add(k);
    }
  }
  return [...keys]
    .sort((x, y) => x.localeCompare(y))
    .map((k) => {
      // Keys may differ in spelling between the two records; match by alias-normal form.
      const pick = (v: Vehicle) => {
        const hit = Object.entries(v.specs ?? {}).find(([kk]) => norm(kk) === norm(k));
        return hit ? real(hit[1]) : null;
      };
      return row(k, pick(a), pick(b));
    });
}

export function buildComparison(a: Vehicle, b: Vehicle): Comparison {
  const groups: CompareGroup[] = [
    {
      title: 'Pricing & Trim',
      icon: 'pricetag-outline',
      rows: [
        row('Price', real(a.price) && fmtPrice(a.price), real(b.price) && fmtPrice(b.price)),
        row('Trim', real(a.trim), real(b.trim)),
        row('Model Year', real(a.year), real(b.year)),
        row('Colour', real(a.color), real(b.color)),
        row('Warranty', spec(a, 'warranty'), spec(b, 'warranty')),
        row('Showroom', real(a.location), real(b.location)),
      ],
    },
    {
      title: 'Performance & Engine',
      icon: 'speedometer-outline',
      rows: [
        row('Engine', real(a.engine), real(b.engine)),
        row('Power', spec(a, 'power'), spec(b, 'power')),
        row('Torque', spec(a, 'torque'), spec(b, 'torque')),
        row('Transmission', real(a.transmission), real(b.transmission)),
        row('Fuel Type', real(a.fuelType), real(b.fuelType)),
        row('Fuel Economy / Range', spec(a, 'economy'), spec(b, 'economy')),
        row('Drivetrain', spec(a, 'drivetrain'), spec(b, 'drivetrain')),
        row('0–100 km/h', spec(a, 'acceleration'), spec(b, 'acceleration')),
        row('Top Speed', spec(a, 'topSpeed'), spec(b, 'topSpeed')),
        // Mileage of 0 is meaningful (brand new), so it is not filtered by `real`.
        row('Odometer', fmtMileage(a.mileage), fmtMileage(b.mileage)),
      ],
    },
    {
      title: 'Dimensions & Capacity',
      icon: 'resize-outline',
      rows: [
        row('Seating Capacity', spec(a, 'seating'), spec(b, 'seating')),
        row('Cargo Space', spec(a, 'cargo'), spec(b, 'cargo')),
        row('Fuel / Battery Capacity', spec(a, 'tank'), spec(b, 'tank')),
        row('Ground Clearance', spec(a, 'groundClearance'), spec(b, 'groundClearance')),
        row('Dimensions', spec(a, 'dimensions'), spec(b, 'dimensions')),
      ],
    },
    {
      title: 'Features & Tech',
      icon: 'hardware-chip-outline',
      rows: [
        row('Infotainment', spec(a, 'infotainment'), spec(b, 'infotainment')),
        row('Safety', spec(a, 'safety'), spec(b, 'safety')),
        row('Driver Assistance', spec(a, 'assistance'), spec(b, 'assistance')),
        row('Audio', spec(a, 'audio'), spec(b, 'audio')),
      ],
    },
  ];

  const extras = extraRows(a, b);
  if (extras.length) {
    groups.push({ title: 'Additional Specs', icon: 'list-outline', rows: extras });
  }

  // Drop rows neither vehicle publishes — an all-blank line teaches the user
  // nothing and just pads the table. Rows where only ONE side is missing are
  // kept, because "this one has it, that one doesn't" is a real finding.
  for (const g of groups) g.rows = g.rows.filter((r) => r.a !== null || r.b !== null);
  const populated = groups.filter((g) => g.rows.length > 0);

  const all = populated.flatMap((g) => g.rows);
  return {
    groups: populated,
    differenceCount: all.filter((r) => r.differs).length,
    unknownCount: all.filter((r) => !r.comparable).length,
    totalRows: all.length,
  };
}

/**
 * Narrow a comparison to rows worth attention in "differences only" mode.
 *
 * Rows with a missing side are KEPT rather than hidden: an unanswered spec is
 * precisely what a buyer needs to notice before committing, and silently
 * dropping it would misrepresent the two cars as more alike than they are.
 */
export function onlyDifferences(c: Comparison): CompareGroup[] {
  return c.groups
    .map((g) => ({ ...g, rows: g.rows.filter((r) => r.differs || !r.comparable) }))
    .filter((g) => g.rows.length > 0);
}
