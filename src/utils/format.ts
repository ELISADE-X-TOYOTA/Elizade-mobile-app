import { APP } from '../constants/app';

/** Number, price, and date formatting helpers. */

/*
  WHY NONE OF THIS USES `Intl` OR `toLocaleString`.

  Release builds run on Hermes, which ships without the full ICU dataset. In
  Expo Go and on a dev server the JS engine has locale data and everything looks
  right; in a bundled .apk / .ipa the same call can return an empty string,
  ignore the locale, or throw. A price that formats correctly on your machine
  and renders blank on a customer's phone is the worst possible failure mode,
  because nothing in development ever shows it.

  `Intl.NumberFormat(locale, { style: 'currency' })` is the sharpest edge —
  currency display needs data Hermes does not carry. `toLocaleString(locale)` is
  milder but still unreliable: it silently drops the thousands separators that
  make a six-figure naira amount readable.

  So the grouping is done by hand. It is a dozen lines, it behaves identically
  in every engine, and it cannot fail silently.
*/

/** Plain grouped integer, no currency symbol. For mileage bands and counts. */
export function groupNumber(value: number | string | null | undefined): string {
  const n = toAmount(value);
  if (n === null) return '—';
  return groupDigits(String(Math.round(Math.abs(n))));
}

/** Inserts thousands separators. Engine-independent by construction. */
function groupDigits(whole: string): string {
  let out = '';
  for (let i = 0; i < whole.length; i++) {
    if (i > 0 && (whole.length - i) % 3 === 0) out += ',';
    out += whole[i];
  }
  return out;
}

/**
 * Anything the API might send → a finite number, or null.
 *
 * Money crosses the wire as a STRING on this backend (Pydantic serialises
 * `Decimal` that way), so a formatter typed `number` is quietly wrong the
 * moment it is handed a real API response. Accepting both is not laxity; it
 * matches what actually arrives.
 */
export function toAmount(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  // Strip a currency symbol and thousands separators, then insist on something
  // actually numeric. Without the emptiness check, "unavailable" cleans down to
  // "" and `Number("")` is 0 — so a server saying it has no price would render
  // as ₦0, which a customer reads as free.
  const cleaned = String(value).replace(/[^\d.-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * A naira amount, or an em dash when there isn't one.
 *
 * The dash matters: a missing price must never render as blank (which reads as
 * a layout bug), as ₦0 (which reads as free), or as "₦NaN".
 */
export function naira(value: number | string | null | undefined): string {
  const n = toAmount(value);
  if (n === null) return '—';
  const rounded = Math.round(Math.abs(n));
  const sign = n < 0 ? '-' : '';
  return `${sign}${APP.currency}${groupDigits(String(rounded))}`;
}

/**
 * Legacy call sites pass a bare number. Kept as a thin alias so the defensive
 * handling above applies everywhere rather than only at new call sites — this
 * used to produce "₦NaN" for an undefined cost.
 */
export function price(value: number | string | null | undefined): string {
  return naira(value);
}

export function priceCompact(value: number | string | null | undefined): string {
  const n = toAmount(value);
  if (n === null) return '—';
  if (n >= 1_000_000) return `${APP.currency}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${APP.currency}${(n / 1_000).toFixed(0)}k`;
  return naira(n);
}

export function perDay(value: number | string | null | undefined): string {
  return `${naira(value)}/day`;
}

/**
 * Odometer reading, or a dash when there isn't one.
 *
 * The parameter used to be a bare `number`, which the type system cannot
 * enforce across an API boundary: responses are parsed JSON, so a null column
 * arrives as `null` and `null.toLocaleString()` takes the screen down. It also
 * accepted NaN — `estMileage` returns NaN whenever a vehicle has no `year` —
 * and rendered a literal "NaN km" to someone deciding whether to buy the car.
 *
 * Both now read as "not published", which is the truth in either case.
 */
export function mileage(km: number | string | null | undefined): string {
  const n = toAmount(km);
  if (n === null) return '—';
  return `${groupDigits(String(Math.round(n)))} km`;
}

/** Numeric-or-nothing variant, for callers that distinguish unknown values. */
export function mileageOrNull(km: number | string | null | undefined): string | null {
  const n = toAmount(km);
  if (n === null) return null;
  return `${groupDigits(String(Math.round(n)))} km`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dayMonth(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}
