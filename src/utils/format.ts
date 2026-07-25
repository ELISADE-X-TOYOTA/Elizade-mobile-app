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

export function mileage(km: number): string {
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
