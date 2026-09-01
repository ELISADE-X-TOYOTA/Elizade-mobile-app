import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/**
 * The device's own lock, wrapped.
 *
 * Everything here fails CLOSED on the capability side and OPEN on nothing: an
 * error reading hardware support reports "unavailable" rather than assuming a
 * sensor exists, and a failed prompt is never treated as a pass.
 */

export type LockMethod = 'face' | 'fingerprint' | 'iris' | 'passcode' | 'none';

export interface LockCapabilities {
  /** The device has biometric hardware of some kind. */
  hasHardware: boolean;
  /** The customer has actually enrolled a fingerprint / face. */
  isEnrolled: boolean;
  /** A device passcode / PIN / pattern is set, which is our fallback. */
  hasPasscode: boolean;
  /** Best available method, for labelling the prompt honestly. */
  method: LockMethod;
  /**
   * Can App Lock be switched on at all? Biometrics OR a device passcode is
   * enough — a customer with a PIN and no fingerprint reader still gets a real
   * gate, and refusing them one would be worse security, not better.
   */
  canUseAppLock: boolean;
}

export const NO_CAPABILITIES: LockCapabilities = {
  hasHardware: false,
  isEnrolled: false,
  hasPasscode: false,
  method: 'none',
  canUseAppLock: false,
};

function pickMethod(types: LocalAuthentication.AuthenticationType[], enrolled: boolean, passcode: boolean): LockMethod {
  if (enrolled) {
    // Face first: on a device with both, Face ID / face unlock is what fires.
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris';
  }
  return passcode ? 'passcode' : 'none';
}

export async function getCapabilities(): Promise<LockCapabilities> {
  // No native module on web; the dev web build must not crash on boot.
  if (Platform.OS === 'web') return NO_CAPABILITIES;
  try {
    const [hasHardware, isEnrolled, types, securityLevel] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
      LocalAuthentication.getEnrolledLevelAsync(),
    ]);
    // SECRET = a PIN/pattern/password is set. BIOMETRIC_* implies one too.
    const hasPasscode = securityLevel !== LocalAuthentication.SecurityLevel.NONE;
    const method = pickMethod(types, isEnrolled, hasPasscode);
    return {
      hasHardware,
      isEnrolled,
      hasPasscode,
      method,
      canUseAppLock: (hasHardware && isEnrolled) || hasPasscode,
    };
  } catch {
    return NO_CAPABILITIES;
  }
}

export type AuthOutcome =
  | { ok: true }
  /** The customer cancelled, or dismissed the sheet. Not a failure to report. */
  | { ok: false; reason: 'cancelled' }
  /** Too many wrong attempts — the OS has temporarily disabled the sensor. */
  | { ok: false; reason: 'lockout' }
  /** No usable gate on this device. */
  | { ok: false; reason: 'unavailable' }
  | { ok: false; reason: 'failed' };

/**
 * Prompt for the device gate.
 *
 * `disableDeviceFallback` is deliberately FALSE: when a fingerprint fails or a
 * customer has none enrolled, the OS offers the PIN. Suppressing that would
 * strand anyone whose sensor is wet, broken, or not set up, with no way into
 * their own account short of reinstalling.
 */
export async function authenticate(promptMessage: string, cancelLabel: string): Promise<AuthOutcome> {
  if (Platform.OS === 'web') return { ok: false, reason: 'unavailable' };
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel,
      disableDeviceFallback: false,
      requireConfirmation: false,
    });
    if (result.success) return { ok: true };

    /*
      Widened to `string` on purpose.

      The declared union is narrower than what the native modules actually
      return — `user_cancel` and `lockout` both arrive at runtime and neither
      appears in the type. Comparing against the literal union would make those
      branches dead code that TypeScript happily accepts, and a cancelled prompt
      would be reported to the customer as a failed fingerprint.
    */
    const error: string = 'error' in result ? String(result.error ?? '') : '';
    if (error === 'user_cancel' || error === 'app_cancel' || error === 'system_cancel') {
      return { ok: false, reason: 'cancelled' };
    }
    if (error === 'lockout' || error === 'lockout_permanent') return { ok: false, reason: 'lockout' };
    if (error === 'not_available' || error === 'not_enrolled') return { ok: false, reason: 'unavailable' };
    return { ok: false, reason: 'failed' };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
