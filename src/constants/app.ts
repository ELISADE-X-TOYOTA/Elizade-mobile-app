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
  version: Constants.expoConfig?.version ?? '1.0.0',
} as const;
