#!/usr/bin/env node
/**
 * Tests the real `src/constants/otp.ts`.
 *
 * THE BUG THIS GUARDS: the OTP screens showed one clock — the 60-second resend
 * cooldown — and testers read it as the code's lifetime, because it was the
 * only number on the screen. The email said ten minutes. Same code, two
 * answers, and people abandoned codes that had nine minutes left on them.
 *
 * The fix makes the server's `expires_in_minutes` the single source for both
 * the screen and the email, so what is tested here is that the arithmetic
 * behind that number cannot quietly go wrong again:
 *
 *   * a missing or nonsensical lifetime falls back rather than rendering NaN
 *   * the two clocks stay distinct, with the cooldown far shorter
 *   * time is measured against absolute deadlines, so backgrounding the app to
 *     go and read the email — the single most likely thing a user does on this
 *     screen — does not leave the countdown believing time stood still
 *
 * None of that is reachable by clicking through the app: the interesting cases
 * are ten minutes apart, or require suspending the JS timer.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'elz-otp-'));
const tscBin = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');

try {
  execFileSync(
    process.execPath,
    [tscBin, 'src/constants/otp.ts', '--outDir', out, '--module', 'commonjs', '--target', 'es2020'],
    { stdio: 'pipe', cwd: path.join(__dirname, '..') },
  );
} catch (e) {
  console.error('Could not compile otp.ts');
  console.error(e.stdout?.toString() || e.message);
  process.exit(1);
}

const {
  RESEND_SECONDS,
  DEFAULT_OTP_EXPIRY_MINUTES,
  formatCountdown,
  otpDeadlinesFrom,
  secondsUntil,
} = require(path.join(out, 'otp.js'));

let pass = 0;
let fail = 0;
const check = (name, cond, detail) => {
  if (cond) {
    pass++;
    console.log(`  ok   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const T0 = 1_700_000_000_000; // a fixed instant; nothing here depends on "now"
const MIN = 60_000;

// ── The discrepancy itself ────────────────────────────────────────────
console.log('\nthe two clocks are different clocks');

{
  const d = otpDeadlinesFrom(10, T0);
  check(
    'expiry is the server lifetime, not the cooldown',
    secondsUntil(d.expiresAt, T0) === 600,
    `got ${secondsUntil(d.expiresAt, T0)}s`,
  );
  check(
    'cooldown is 60s and stays 60s',
    secondsUntil(d.resendAt, T0) === RESEND_SECONDS,
    `got ${secondsUntil(d.resendAt, T0)}s`,
  );
  check(
    'expiry outlasts the cooldown, so resend never strands anyone',
    d.expiresAt > d.resendAt,
  );
}

{
  // The screen must echo whatever the backend says, not a number of its own.
  const d = otpDeadlinesFrom(3, T0);
  check(
    'a backend configured for 3 minutes shows 3 minutes',
    secondsUntil(d.expiresAt, T0) === 180,
    `got ${secondsUntil(d.expiresAt, T0)}s`,
  );
}

// ── Fallbacks: never render NaN on the sign-in screen ─────────────────
console.log('\na server that says nothing falls back, it does not render NaN');

for (const [label, value] of [
  ['undefined', undefined],
  ['null', null],
  ['NaN', NaN],
  ['a string', 'ten'],
  ['zero', 0],
  ['negative', -5],
]) {
  const d = otpDeadlinesFrom(value, T0);
  const secs = secondsUntil(d.expiresAt, T0);
  check(
    `${label} -> the ${DEFAULT_OTP_EXPIRY_MINUTES}-minute default`,
    secs === DEFAULT_OTP_EXPIRY_MINUTES * 60,
    `got ${secs}s`,
  );
  check(`${label} -> label is not NaN`, /^\d+:\d\d$/.test(formatCountdown(secs)),
    formatCountdown(secs));
}

{
  // A numeric string is what `useLocalSearchParams` hands back — the login
  // screen passes the lifetime through the router, so it arrives as text.
  const d = otpDeadlinesFrom(Number('10'), T0);
  check(
    'a lifetime routed through navigation params still counts as 10 minutes',
    secondsUntil(d.expiresAt, T0) === 600,
  );
}

// ── Backgrounding: the whole reason for absolute deadlines ────────────
console.log('\ntime passes while the app is backgrounded');

{
  const d = otpDeadlinesFrom(10, T0);
  // The user leaves to open their mail. JS timers are throttled or stopped;
  // a decrementing counter would come back believing nothing had happened.
  const awayFor = 7 * MIN;
  check(
    'seven minutes in the mail app leaves three, not ten',
    secondsUntil(d.expiresAt, T0 + awayFor) === 180,
    `got ${secondsUntil(d.expiresAt, T0 + awayFor)}s`,
  );
  check(
    'a code that lapsed while backgrounded reads as expired on return',
    secondsUntil(d.expiresAt, T0 + 11 * MIN) === 0,
  );
  check(
    'the cooldown also elapses while away, so resend is available',
    secondsUntil(d.resendAt, T0 + 2 * MIN) === 0,
  );
}

// ── Boundaries ────────────────────────────────────────────────────────
console.log('\nboundaries');

{
  const d = otpDeadlinesFrom(10, T0);
  check('never negative past the deadline', secondsUntil(d.expiresAt, T0 + 60 * MIN) === 0);
  check(
    'the final part-second still reads 0:01, not 0:00',
    secondsUntil(d.expiresAt, d.expiresAt - 400) === 1,
    `got ${secondsUntil(d.expiresAt, d.expiresAt - 400)}`,
  );
  check('exactly on the deadline is expired', secondsUntil(d.expiresAt, d.expiresAt) === 0);
}

console.log('\nlabels');
check('600s renders as 10:00', formatCountdown(600) === '10:00', formatCountdown(600));
check('59s pads the seconds', formatCountdown(59) === '0:59', formatCountdown(59));
check('9s pads to 0:09', formatCountdown(9) === '0:09', formatCountdown(9));
check('0 renders as 0:00', formatCountdown(0) === '0:00', formatCountdown(0));
check('negative clamps to 0:00', formatCountdown(-30) === '0:00', formatCountdown(-30));

fs.rmSync(out, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
