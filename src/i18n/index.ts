/**
 * Localisation engine.
 *
 * ── WHY INITIALISATION IS SYNCHRONOUS ──
 *
 * i18next is configured at module load with the device locale, before React
 * renders. An async init would let the first frame paint in English and then
 * snap to the user's language — a visible flash on every cold start. The
 * saved preference is applied a moment later from AsyncStorage (which cannot
 * be read synchronously); until it arrives the device locale is the best
 * guess available, and for most users it is already the right one.
 *
 * ── WHY RTL NEEDS A RESTART ──
 *
 * `I18nManager.forceRTL` flips how the native layout engine resolves
 * `flexDirection: 'row'` and start/end padding. Views already mounted keep
 * their old direction, so switching to Arabic mid-session leaves a
 * half-mirrored screen. React Native has always required a reload here. The
 * app has no `expo-updates`, so `changeLanguage` reports whether a restart
 * is needed and the caller asks the user — see `app/language.tsx`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import ar from './locales/ar.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ha from './locales/ha.json';
import ig from './locales/ig.json';
import yo from './locales/yo.json';

import { DEFAULT_LANGUAGE, findLanguage } from './languages';

export { LANGUAGES, findLanguage, isRTL } from './languages';
export type { Language } from './languages';

/** AsyncStorage key. Separate from the zustand store: i18n must initialise
 *  before the store rehydrates, so it owns its own persistence. */
const STORAGE_KEY = 'elizade-language';

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  es: { translation: es },
  ar: { translation: ar },
  ha: { translation: ha },
  yo: { translation: yo },
  ig: { translation: ig },
} as const;

/** The device's language, narrowed to one we actually ship. */
function deviceLanguage(): string {
  try {
    const tag = Localization.getLocales()[0]?.languageTag;
    return findLanguage(tag).code;
  } catch {
    // Localization can throw on a device with no locale configured.
    return DEFAULT_LANGUAGE;
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  // A missing Yoruba key falls back to English rather than rendering the raw
  // key. Users see a real word in the wrong language, not "profile.title".
  returnEmptyString: false,
  interpolation: {
    // React already escapes rendered output; escaping here would
    // double-encode apostrophes in French ("l&#39;offre").
    escapeValue: false,
  },
  react: { useSuspense: false },
});

/** Loads and applies the saved language. Call once on app start. */
export async function restoreLanguage(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const lang = findLanguage(saved);
    if (lang.code !== i18n.language) await i18n.changeLanguage(lang.code);
    syncRtl(lang.code);
  } catch {
    // A failed read must not stop the app booting — the device locale stands.
  }
}

/**
 * Aligns the native layout direction with a language.
 *
 * Returns true when the direction actually changed, which is the caller's
 * cue that a restart is required for the change to render correctly.
 */
export function syncRtl(code: string): boolean {
  const shouldBeRtl = findLanguage(code).rtl;
  if (I18nManager.isRTL === shouldBeRtl) return false;
  I18nManager.allowRTL(shouldBeRtl);
  I18nManager.forceRTL(shouldBeRtl);
  return true;
}

/**
 * Switches language and persists the choice.
 *
 * Resolves to true when the layout direction flipped and the app must be
 * restarted before it will look right.
 */
export async function changeLanguage(code: string): Promise<boolean> {
  const lang = findLanguage(code);
  await i18n.changeLanguage(lang.code);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang.code);
  } catch {
    // The language still changed for this session; only persistence failed.
  }
  return syncRtl(lang.code);
}

/** The active language's formatting locale, for numbers and dates. */
export function formatLocale(): string {
  return findLanguage(i18n.language).formatLocale;
}

export default i18n;
