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

export interface LaunchInput {
  /** True when credentials were found in the secure store. */
  hasStoredSession: boolean;
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
}: LaunchInput): ResumeAction {
  if (!hasStoredSession) return 'restore';
  if (lastActiveAt === null) return 'signOut';
  return hasBackgroundTimedOut({ backgroundedAt: lastActiveAt, now, timeoutMs }) ? 'signOut' : 'restore';
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
