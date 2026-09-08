import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  OtpDeadlines,
  formatCountdown,
  otpDeadlinesFrom,
  secondsUntil,
} from '../constants/otp';

/**
 * The two OTP clocks, kept together so they cannot be confused for each other.
 *
 * They answer different questions and used to be conflated:
 *   * `expiry`  — how long the code stays valid. The server's number, the same
 *                 one the email prints. This is what a user actually wants.
 *   * `resend`  — how long until a new code can be requested. A rate limit on
 *                 our side, of no interest except when the mail hasn't arrived.
 *
 * Both screens showed only the second one, so the app appeared to say codes
 * expire in a minute while the email said ten.
 *
 * DEADLINES, NOT TICKS. Both screens previously decremented a counter once a
 * second, which is wrong for this screen specifically: the user's next action
 * is to LEAVE the app and open their mail. JS timers are throttled or stopped
 * while backgrounded, so a decrementing counter comes back believing almost no
 * time has passed — it would happily show "8:12 left" on a code that lapsed
 * while the user was reading the email that carried it. Storing the absolute
 * instants and rendering `deadline - now` is immune to that: the arithmetic is
 * the same whether the timer fired 600 times or not at all.
 */
export interface OtpCountdown {
  /** Seconds until the code stops being accepted. */
  expirySeconds: number;
  /** Seconds until "Resend code" unlocks. */
  resendSeconds: number;
  /** `m:ss` until the code lapses. */
  expiryLabel: string;
  /** `m:ss` until resend unlocks. */
  resendLabel: string;
  /** The code on screen is past its lifetime; verifying it will be rejected. */
  expired: boolean;
  /** Cooldown elapsed — or the code expired, which overrides the cooldown. */
  canResend: boolean;
  /** Restart both clocks after a code is (re)sent. Pass the server's minutes. */
  restart: (expiresInMinutes?: number | null) => void;
}

export function useOtpCountdown(options: { active?: boolean } = {}): OtpCountdown {
  const { active = true } = options;

  const [deadlines, setDeadlines] = useState<OtpDeadlines>(() => otpDeadlinesFrom());
  const [now, setNow] = useState(() => Date.now());

  const expirySeconds = secondsUntil(deadlines.expiresAt, now);
  const resendSeconds = secondsUntil(deadlines.resendAt, now);

  // One interval driving both, and it stops once there is nothing left to
  // count. `ticking` is a boolean so the effect re-runs when it flips rather
  // than being torn down and rebuilt on every tick.
  const ticking = active && (resendSeconds > 0 || expirySeconds > 0);
  useEffect(() => {
    if (!ticking) return;
    // Re-reading the clock rather than decrementing means a missed tick costs
    // nothing: the next one that lands is still correct.
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ticking]);

  // A screen that mounts the hook inactive (the register wizard, before its
  // OTP step) must not show a stale reading on the frame it becomes active.
  useEffect(() => {
    if (active) setNow(Date.now());
  }, [active]);

  const restart = useCallback((expiresInMinutes?: number | null) => {
    const at = Date.now();
    setDeadlines(otpDeadlinesFrom(expiresInMinutes, at));
    setNow(at);
  }, []);

  return useMemo(
    () => ({
      expirySeconds,
      resendSeconds,
      expiryLabel: formatCountdown(expirySeconds),
      resendLabel: formatCountdown(resendSeconds),
      expired: expirySeconds <= 0,
      // An expired code must always be replaceable. Holding someone behind the
      // cooldown with a code that can no longer work is a dead end — it cannot
      // happen while the cooldown is shorter than the lifetime, but it must not
      // depend on that staying true.
      canResend: resendSeconds <= 0 || expirySeconds <= 0,
      restart,
    }),
    [expirySeconds, resendSeconds, restart],
  );
}
