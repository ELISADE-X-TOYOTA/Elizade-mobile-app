/**
 * Input sanitisation & validation.
 *
 * SECURITY: all free-text leaving the app is normalised here — control
 * characters stripped, length capped, whitespace collapsed — so a payload can't
 * carry terminal escapes, null bytes or unbounded blobs into the backend, logs
 * or an admin dashboard that renders it. Defence-in-depth: the server must
 * still validate input and escape on output.
 */

/** C0 controls, DEL, and the C1 range. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = new RegExp('[\u0000-\u001F\u007F-\u009F]', 'g');

/** Strips control chars, collapses whitespace, trims and caps length. */
export function clean(input: string, maxLength = 500): string {
  return input
    .replace(CONTROL_CHARS, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** Free-text notes / descriptions. */
export const cleanText = (v: string) => clean(v, 1000);

/** Names: letters, marks, spaces, hyphens and apostrophes only. */
export function cleanName(v: string): string {
  return clean(v, 80).replace(/[^\p{L}\p{M}\s'-]/gu, '');
}

/** Lowercased, whitespace-free email. */
export function cleanEmail(v: string): string {
  return clean(v, 254).toLowerCase().replace(/\s+/g, '');
}

/** Digits plus a single leading '+'. */
export function cleanPhone(v: string): string {
  const raw = v.replace(/[^\d+]/g, '');
  const plus = raw.startsWith('+');
  return (plus ? '+' : '') + raw.replace(/\+/g, '').slice(0, 15);
}

/** VIN: uppercase alphanumeric excluding I/O/Q, max 17. */
export function cleanVin(v: string): string {
  return v.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
}

/** Digits only (mileage, year, OTP). */
export const cleanDigits = (v: string, max = 9) => v.replace(/\D/g, '').slice(0, max);

// ── Validators ───────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export const isValidEmail = (v: string) => EMAIL_RE.test(cleanEmail(v));
export const isValidPhone = (v: string) => cleanPhone(v).replace(/\D/g, '').length >= 7;
export const isValidName = (v: string) => cleanName(v).length >= 2;
export const isValidVin = (v: string) => cleanVin(v).length === 17;
