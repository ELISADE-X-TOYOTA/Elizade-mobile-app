/**
 * One-time-code timings.
 *
 * THE BUG THIS EXISTS TO CLOSE: the only clock the OTP screens showed was the
 * 60-second resend cooldown — "Resend in 0:57" — and testers read it as the
 * code's lifetime, because it was the only number on the screen. The email
 * said ten minutes. Same code, two different answers, and the app's was the
 * one people believed, so they abandoned a code that had nine minutes left.
 *
 * Nothing about the backend was wrong: `settings.otp_expire_minutes` is 10 and
 * the email renders it from that same setting. The app just never asked. It is
 * asking now — `/auth/otp/request` returns `expires_in_minutes`, so the number
 * on the screen and the number in the email come from one place.
 */

/** Seconds before "Resend code" becomes available again. Purely a cooldown. */
export const RESEND_SECONDS = 60;

/**
 * Fallback lifetime, used only when the server does not say.
 *
 * Matches `otp_expire_minutes` in the backend config. It is a fallback and not
 * the source of truth: hardcoding the lifetime here is precisely how the two
 * numbers drifted apart in the first place, so the server's answer always wins
 * and this is reached only when the response omits the field.
 */
export const DEFAULT_OTP_EXPIRY_MINUTES = 10;

/** `m:ss`, for both countdowns. */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

/** The instants a freshly-issued code is governed by. */
export interface OtpDeadlines {
  /** When the code stops being accepted. */
  expiresAt: number;
  /** When a replacement may be requested. */
  resendAt: number;
}

/**
 * Anchor both clocks to now, from the server's stated lifetime.
 *
 * `expiresInMinutes` is whatever `/auth/otp/request` returned, which may be
 * absent on an older backend and is not trusted to be a number: a missing or
 * nonsensical value falls back rather than putting "expires in NaN" on the
 * sign-in screen.
 */
export function otpDeadlinesFrom(
  expiresInMinutes?: number | null,
  now: number = Date.now(),
): OtpDeadlines {
  const minutes = Number(expiresInMinutes);
  const resolved =
    Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_OTP_EXPIRY_MINUTES;
  return {
    expiresAt: now + resolved * 60_000,
    resendAt: now + RESEND_SECONDS * 1000,
  };
}

/**
 * Whole seconds left, never negative.
 *
 * Rounded UP so the last partial second still reads "0:01" — a countdown that
 * shows 0:00 while the code is in fact still good invites someone to discard a
 * working code, which is the smaller cousin of the bug this file exists for.
 */
export function secondsUntil(deadline: number, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
