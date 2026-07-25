import Constants from 'expo-constants';

/** App-wide constants and feature flags. */
export const APP = {
  name: 'Elizade',
  currency: '₦',
  /** Shares the Elizade web backend. Set EXPO_PUBLIC_API_URL to override. */
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_URL ?? 'https://api.elizade.example.com/api/v1',
  /** When true, bundled mock data powers the UI instead of the API. */
  useMock: (process.env.EXPO_PUBLIC_USE_MOCK ?? 'true') === 'true',
  version: Constants.expoConfig?.version ?? '1.0.0',
} as const;
