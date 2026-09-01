import Constants from 'expo-constants';

/**
 * Placeholder used when nothing has configured a real API host.
 *
 * Kept as a named constant so the release-build guard below can recognise it.
 */
const UNCONFIGURED_API = 'https://api.elizade.example.com/api/v1';

const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const configuredMock = process.env.EXPO_PUBLIC_USE_MOCK?.trim();

/**
 * Discard any stored session on launch and open at the login screen.
 *
 * For testing the sign-in flow. Without it the app does what a customer wants
 * — a token saved at last sign-in is restored and the splash goes straight to
 * the home tab, which looks like "auto login" when you are trying to reach the
 * auth screens on purpose.
 *
 * Off unless explicitly "true", so a release build cannot inherit it and sign
 * every customer out on every launch.
 */
const startSignedOut = process.env.EXPO_PUBLIC_START_SIGNED_OUT?.trim() === 'true';

/**
 * Show the service price board.
 *
 * OFF until Elizade publishes real prices. The screen and its API client are
 * finished and reachable the moment this flips, but until a real price book
 * exists the only thing behind it is sample data — and a price in a customer's
 * hand is a quote. A wrong one costs the dealership an argument at the desk.
 *
 * Turning it on needs BOTH: this flag, and a published price book on the
 * backend. The screen still renders its "not published yet" state if the flag
 * is on and the board is empty, so flipping it early is safe, just pointless.
 */
const servicePrices = process.env.EXPO_PUBLIC_SERVICE_PRICES?.trim() === 'true';

/**
 * MOCK DEFAULTS DIFFER BY BUILD, deliberately.
 *
 * A fresh dev checkout with no `.env` should still run, so development
 * defaults to bundled mock content. A RELEASE build must never do that: an
 * APK that quietly serves fake vehicles and fake tickets looks completely
 * healthy to whoever is testing it, and the fault is only discovered when
 * someone notices the data never changes. So release defaults to the real API.
 */
const useMock = configuredMock !== undefined ? configuredMock === 'true' : __DEV__;

/**
 * A release build pointing at the placeholder host is a BUILD misconfiguration
 * — almost always `.env` being gitignored and therefore absent from a cloud
 * build, with the API URL never set on the build profile instead.
 *
 * Failing here, loudly and immediately, is the point. The alternative is an
 * APK that installs, opens, and fails every request against a domain that does
 * not exist, which reads as "the backend is down" and costs an afternoon.
 *
 * Skipped when mocking, because then no API host is needed at all.
 */
if (!__DEV__ && !useMock && (!configuredUrl || configuredUrl === UNCONFIGURED_API)) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is not set for this build. Set it on the EAS build ' +
      'profile in eas.json — a .env file is gitignored and is NOT uploaded to ' +
      'a cloud build.',
  );
}

/** App-wide constants and feature flags. */
export const APP = {
  name: 'Elizade',
  currency: '₦',
  /** Shares the Elizade web backend. Set EXPO_PUBLIC_API_URL to override. */
  apiBaseUrl: configuredUrl || UNCONFIGURED_API,
  /** When true, bundled mock data powers the UI instead of the API. */
  useMock,
  /** When true, every launch clears the stored session and opens at login. */
  startSignedOut,
  /** When true, the service price board is reachable from the Service tab. */
  servicePrices,
  version: Constants.expoConfig?.version ?? '1.0.0',
} as const;
