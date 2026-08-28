/**
 * Supported locales.
 *
 * Each language is listed by its ENDONYM — the name speakers use for it
 * ("Français", not "French"). A selector that labels languages in English is
 * useless to the person who needs it: someone who reads only Hausa cannot
 * find their language in a list written in a language they don't read.
 */

export interface Language {
  /** BCP-47 code, also the translation-file name. */
  code: string;
  /** The language's name in itself — what the selector shows. */
  endonym: string;
  /** English name, for accessibility labels and support diagnostics. */
  english: string;
  /** Right-to-left script. Drives layout mirroring. */
  rtl: boolean;
  /**
   * Locale used for number, date and currency formatting. Not always the
   * same as `code`: Nigerian languages format money as Nigeria does, so
   * Yoruba shows ₦1,250,000 rather than a Latin-American grouping.
   */
  formatLocale: string;
}

export const LANGUAGES: readonly Language[] = [
  { code: 'en', endonym: 'English', english: 'English', rtl: false, formatLocale: 'en-NG' },
  { code: 'fr', endonym: 'Français', english: 'French', rtl: false, formatLocale: 'fr-FR' },
  { code: 'es', endonym: 'Español', english: 'Spanish', rtl: false, formatLocale: 'es-ES' },
  { code: 'ar', endonym: 'العربية', english: 'Arabic', rtl: true, formatLocale: 'ar-EG' },
  { code: 'ha', endonym: 'Hausa', english: 'Hausa', rtl: false, formatLocale: 'en-NG' },
  { code: 'yo', endonym: 'Yorùbá', english: 'Yoruba', rtl: false, formatLocale: 'en-NG' },
  { code: 'ig', endonym: 'Igbo', english: 'Igbo', rtl: false, formatLocale: 'en-NG' },
] as const;

export const DEFAULT_LANGUAGE = 'en';

export const SUPPORTED_CODES = LANGUAGES.map((l) => l.code);

export function findLanguage(code: string | undefined | null): Language {
  if (!code) return LANGUAGES[0];
  // Match on the base tag so a device set to "fr-CA" or "ar-SA" still
  // resolves — we ship one variant per language, not per region.
  const base = code.split('-')[0].toLowerCase();
  return LANGUAGES.find((l) => l.code === base) ?? LANGUAGES[0];
}

export function isRTL(code: string): boolean {
  return findLanguage(code).rtl;
}
