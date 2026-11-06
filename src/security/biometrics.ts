import * as LocalAuthentication from 'expo-local-authentication';

import { readBiometricPreference } from '../api/session';
import type { BiometricState } from './lockPolicy';

/**
 * The device half of the lock: can this phone say "yes, still them"?
 *
 * Kept apart from `lockPolicy` on purpose. The policy is pure and decides
 * WHAT to do; this module touches native modules and secure storage and
 * answers WHETHER the device can be asked. Mixing them is what made the
 * previous attempt untestable.
 *
 * NOTHING HERE BINDS A CREDENTIAL TO BIOMETRICS. The earlier implementation
 * stored the token with `requireAuthentication`, so the operating system
 * raised a prompt on every read — including reads the app made in the
 * background — and kept doing so after the feature was deleted, which needed
 * a one-time purge to clear. The prompt lives in front of the SCREEN here;
 * the token stays an ordinary secure-store item that code can read without
 * asking anyone.
 */

/** Hardware present, something enrolled, and the customer has not opted out. */
export async function readBiometricState(): Promise<BiometricState> {
  try {
    const [hasHardware, isEnrolled, enabled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      // Enrolment matters as much as hardware: a phone with a Face ID sensor
      // and no face registered can never satisfy the prompt, and treating it
      // as capable would lock someone out of their own session.
      LocalAuthentication.isEnrolledAsync(),
      readBiometricPreference(),
    ]);
    return { available: hasHardware && isEnrolled, enabled };
  } catch {
    // Any native failure means we cannot promise an unlock. Reporting
    // "unavailable" sends the customer down the OTP path, which is slower
    // but always works.
    return { available: false, enabled: false };
  }
}

/** What to call the prompt, so the UI can say "Face ID" rather than "biometrics". */
export async function describeBiometric(): Promise<'face' | 'fingerprint' | 'iris' | 'generic'> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris';
    return 'generic';
  } catch {
    return 'generic';
  }
}

export type UnlockOutcome = 'unlocked' | 'failed' | 'unavailable';

/**
 * Ask the device to confirm its owner.
 *
 * `disableDeviceFallback` is FALSE deliberately: the passcode is a legitimate
 * second answer to the same question, and refusing it would strand anyone
 * whose face is not recognised — wet hands, a mask, a cracked sensor — behind
 * an email that may never arrive.
 */
export async function requestUnlock(prompt: string): Promise<UnlockOutcome> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: prompt,
      disableDeviceFallback: false,
      cancelLabel: undefined,
    });
    return result.success ? 'unlocked' : 'failed';
  } catch {
    return 'unavailable';
  }
}
