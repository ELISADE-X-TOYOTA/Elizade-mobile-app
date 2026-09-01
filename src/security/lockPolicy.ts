/**
 * When the app must re-authenticate. Pure, clock-injected, no React, no native.
 *
 * TWO SEPARATE CLOCKS, and conflating them is the mistake this module exists to
 * prevent:
 *
 *   1. THE LOCK. Short. Away for more than a few minutes, prove it is still you
 *      — a fingerprint. The session is intact; the screen is just covered.
 *
 *   2. THE SESSION. Long. Away for weeks, the credential itself is stale and no
 *      fingerprint should revive it — sign out properly and make them log in.
 *
 * Collapsing these gives you either a fingerprint prompt every time someone
 * checks a text message, or a token that lives forever behind a lock that a
 * stolen, unlocked phone walks straight past.
 */

/** Background grace before the lock screen goes up. */
export const DEFAULT_LOCK_GRACE_MS = 5 * 60 * 1000;

/**
 * Total inactivity before the session is discarded and a full login is needed.
 *
 * Fourteen days: long enough that a customer servicing a car twice a year is
 * not re-authenticating constantly, short enough that a forgotten handset in a
 * drawer is not a standing credential.
 */
export const DEFAULT_SESSION_MAX_IDLE_MS = 14 * 24 * 60 * 60 * 1000;

export interface LockDecisionInput {
  /** Has the customer switched App Lock on? */
  enabled: boolean;
  /** When the app last went to the background. Null = it has not since launch. */
  backgroundedAt: number | null;
  now: number;
  graceMs?: number;
}

/**
 * Should the lock screen be shown on resume?
 *
 * A backgrounded timestamp in the FUTURE is treated as "lock". That is not
 * paranoia: the device clock is user-writable, and a phone wound forward makes
 * every elapsed time negative. Failing closed costs one fingerprint; failing
 * open hands over the account.
 */
export function shouldLockOnResume({
  enabled,
  backgroundedAt,
  now,
  graceMs = DEFAULT_LOCK_GRACE_MS,
}: LockDecisionInput): boolean {
  if (!enabled) return false;
  if (backgroundedAt === null) return false;
  const elapsed = now - backgroundedAt;
  if (elapsed < 0) return true;
  return elapsed >= graceMs;
}

export interface SessionExpiryInput {
  /** Last time the app was demonstrably in use. Null = never recorded. */
  lastActiveAt: number | null;
  now: number;
  maxIdleMs?: number;
}

/**
 * Has the stored session gone stale enough to discard?
 *
 * A null `lastActiveAt` does NOT expire the session. That value is written by a
 * build that records it; a token saved by an older build has no stamp, and
 * signing those customers out on upgrade would read as the app losing their
 * account. They get stamped on this run and expire normally from here.
 */
export function isSessionExpired({
  lastActiveAt,
  now,
  maxIdleMs = DEFAULT_SESSION_MAX_IDLE_MS,
}: SessionExpiryInput): boolean {
  if (lastActiveAt === null) return false;
  const idle = now - lastActiveAt;
  if (idle < 0) return false; // clock moved backwards — not evidence of staleness
  return idle >= maxIdleMs;
}

/** What the app should do with a stored session when it comes to the foreground. */
export type ResumeAction = 'proceed' | 'lock' | 'signOut';

export interface ResumeInput extends LockDecisionInput {
  lastActiveAt: number | null;
  maxIdleMs?: number;
  /** False when there is no stored session — nothing to lock or expire. */
  hasSession: boolean;
}

/**
 * The single decision the app acts on.
 *
 * Expiry outranks the lock deliberately. If both are due, signing out is the
 * stronger outcome, and prompting for a fingerprint only to then bounce the
 * customer to the login screen is a worse experience than going there directly.
 */
export function decideOnResume(input: ResumeInput): ResumeAction {
  if (!input.hasSession) return 'proceed';
  if (isSessionExpired({ lastActiveAt: input.lastActiveAt, now: input.now, maxIdleMs: input.maxIdleMs })) {
    return 'signOut';
  }
  return shouldLockOnResume(input) ? 'lock' : 'proceed';
}
