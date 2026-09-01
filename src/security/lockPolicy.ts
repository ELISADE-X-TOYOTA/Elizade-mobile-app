/**
 * When a backgrounded session has gone stale. Pure, clock-injected, no React,
 * no native modules — so the boundaries can actually be tested.
 *
 * ONE RULE: five minutes in the background ends the session. Coming back inside
 * that window restores the app exactly as it was; coming back outside it means
 * signing in again with a fresh email OTP.
 *
 * There is no biometric tier. An earlier design had a short "lock" and a long
 * "expiry", which produced a fingerprint prompt on every cold launch and every
 * resume — two gates asking the same question seconds apart. This replaces both
 * with the single timeout, and re-authentication is the OTP the customer
 * already uses to sign in.
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

/** What to do when the app comes back to the foreground. */
export type ResumeAction = 'restore' | 'signOut';

export interface ResumeInput extends TimeoutInput {
  /** False when nobody is signed in — nothing to invalidate. */
  hasSession: boolean;
}

export function decideOnResume(input: ResumeInput): ResumeAction {
  if (!input.hasSession) return 'restore';
  return hasBackgroundTimedOut(input) ? 'signOut' : 'restore';
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
