/**
 * What to do with a session that has been away. Pure, clock-injected, no
 * React, no native modules — so the boundaries can actually be tested.
 *
 * THE RULE: five minutes away and the app stops showing the customer's data.
 * What happens next depends on whether this device can prove who they are.
 *
 *   biometrics on   → LOCK. The session is kept; Face ID or the device
 *                     passcode reopens it.
 *   biometrics off  → SIGN OUT, as before, and a fresh email OTP to return.
 *
 * WHY THIS CHANGED. Ending the session was the only option when the app had
 * no way to re-identify anyone, and it made OTP feel compulsory: a customer
 * who took a phone call came back to a login screen and waited on an email.
 * With mail to Outlook and Hotmail being dropped by SPF, that wait was
 * sometimes permanent.
 *
 * ONE GATE, NOT TWO. Biometrics were in this app once and were removed for a
 * good reason: a short "lock" and a long "expiry" ran as separate tiers, so a
 * cold launch raised a fingerprint prompt and the resume raised another —
 * two gates asking the same question seconds apart. There is still exactly
 * one timeout here. `lock` and `signOut` are two answers to it, never two
 * questions.
 *
 * AND NOTHING IS BOUND TO BIOMETRICS. The other half of that earlier failure
 * was storing credentials with `requireAuthentication`, which kept prompting
 * after the feature was deleted and needed a one-time purge to clear. The
 * prompt belongs in the app, in front of the data; the token stays an
 * ordinary secure-store item.
 */

/** Background grace. Past this, the session is invalidated. */
export const BACKGROUND_TIMEOUT_MS = 5 * 60 * 1000;

export interface TimeoutInput {
  /** When the app went to the background. Null = it has not since launch. */
  backgroundedAt: number | null;
  now: number;
  timeoutMs?: number;
}

/**
 * Has the background window elapsed?
 *
 * A timestamp in the FUTURE counts as expired. The device clock is
 * user-writable, so a phone wound forward makes every elapsed time negative;
 * failing closed costs one sign-in, failing open leaves an abandoned handset
 * signed in indefinitely.
 */
export function hasBackgroundTimedOut({
  backgroundedAt,
  now,
  timeoutMs = BACKGROUND_TIMEOUT_MS,
}: TimeoutInput): boolean {
  if (backgroundedAt === null) return false;
  const elapsed = now - backgroundedAt;
  if (elapsed < 0) return true;
  return elapsed >= timeoutMs;
}

/**
 * What to do when the app comes back.
 *
 * `lock` keeps the session and demands a biometric; `signOut` discards it and
 * sends the customer back to the OTP.
 */
export type ResumeAction = 'restore' | 'lock' | 'signOut';

/** Whether this device can re-identify its owner without an email round-trip. */
export interface BiometricState {
  /** Hardware present AND a face/fingerprint actually enrolled. */
  available: boolean;
  /** The customer's own choice, from Privacy & Security. Defaults on. */
  enabled: boolean;
}

export interface ResumeInput extends TimeoutInput {
  /** False when nobody is signed in — nothing to invalidate. */
  hasSession: boolean;
  biometrics?: BiometricState;
}

/**
 * Lock when we can ask the phone who this is, sign out when we cannot.
 *
 * `available` is deliberately separate from `enabled`: a customer who has
 * switched the setting off is choosing the OTP, while a phone with no
 * enrolled face or finger has nothing to ask. Both end at `signOut`, and
 * conflating them would have locked people out of a device that could never
 * unlock itself.
 */
export function decideOnResume(input: ResumeInput): ResumeAction {
  if (!input.hasSession) return 'restore';
  if (!hasBackgroundTimedOut(input)) return 'restore';
  return canUnlock(input.biometrics) ? 'lock' : 'signOut';
}

/** Can this device answer "is this still you?" without an email? */
export function canUnlock(biometrics?: BiometricState): boolean {
  return Boolean(biometrics?.available && biometrics.enabled);
}

export interface LaunchInput {
  /** True when credentials were found in the secure store. */
  hasStoredSession: boolean;
  biometrics?: BiometricState;
  /**
   * When the app was last in the foreground, as persisted by the watcher.
   * Null when nothing was ever recorded.
   */
  lastActiveAt: number | null;
  now: number;
  timeoutMs?: number;
}

/**
 * The same five-minute rule, applied at COLD START.
 *
 * THE HOLE THIS CLOSES. The resume check kept its "went to background at"
 * timestamp in memory. iOS evicts backgrounded apps as a matter of routine,
 * and when the customer came back the app relaunched from nothing: the
 * timestamp was gone, the token was still in the secure store, and the
 * session was restored without a question — however long it had been. That
 * is the "stays signed in indefinitely across restarts" QA reported, and it
 * was the rule silently not running rather than the rule being wrong.
 *
 * A stored session with NO recorded activity also signs out. That is one
 * extra sign-in for anyone updating from a build that never wrote the stamp,
 * against never being able to say how long an unstamped handset has sat
 * open. Failing closed costs a minute; failing open is indefinite.
 */
export function decideOnLaunch({
  hasStoredSession,
  lastActiveAt,
  now,
  timeoutMs = BACKGROUND_TIMEOUT_MS,
  biometrics,
}: LaunchInput): ResumeAction {
  if (!hasStoredSession) return 'restore';
  // No stamp at all: an older build, or storage was cleared. Still fails
  // closed — but a device that can prove who it is only has to prove it,
  // rather than losing a session that may be perfectly good.
  if (lastActiveAt === null) return canUnlock(biometrics) ? 'lock' : 'signOut';
  if (!hasBackgroundTimedOut({ backgroundedAt: lastActiveAt, now, timeoutMs })) return 'restore';
  return canUnlock(biometrics) ? 'lock' : 'signOut';
}

/** Milliseconds still available before the session would be invalidated. */
export function remainingMs({
  backgroundedAt,
  now,
  timeoutMs = BACKGROUND_TIMEOUT_MS,
}: TimeoutInput): number {
  if (backgroundedAt === null) return timeoutMs;
  const elapsed = now - backgroundedAt;
  if (elapsed < 0) return 0;
  return Math.max(0, timeoutMs - elapsed);
}
