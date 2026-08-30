import { APP } from '../constants/app';

/** Number, price, and date formatting helpers. */

export function price(value: number): string {
  return `${APP.currency}${Math.round(value).toLocaleString('en-NG')}`;
}

export function priceCompact(value: number): string {
  if (value >= 1_000_000) return `${APP.currency}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${APP.currency}${(value / 1_000).toFixed(0)}k`;
  return price(value);
}

export function perDay(value: number): string {
  return `${price(value)}/day`;
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
export function mileage(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return '—';
  return `${km.toLocaleString('en-NG')} km`;
}

/** Numeric-or-nothing variant, for callers that distinguish unknown values. */
export function mileageOrNull(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  return `${km.toLocaleString('en-NG')} km`;
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
