#!/usr/bin/env node
/**
 * Tests the real `src/security/lockPolicy.ts`.
 *
 * This decides whether the app demands a fingerprint, lets someone straight in,
 * or throws the session away. Every interesting case is a boundary — exactly on
 * the grace period, a clock wound backwards, a token from a build that never
 * recorded a timestamp — and none are reachable by tapping through the app at
 * whatever moment you happen to be testing.
 *
 * Getting it wrong in one direction nags a customer for a fingerprint every
 * time they glance at a notification. Getting it wrong in the other leaves a
 * lost phone signed in.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'elz-lock-'));
const tscBin = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');

try {
  execFileSync(
    process.execPath,
    [tscBin, 'src/security/lockPolicy.ts', '--outDir', out, '--module', 'commonjs', '--target', 'es2020'],
    { stdio: 'pipe', cwd: path.join(__dirname, '..') },
  );
} catch (e) {
  console.error('Could not compile lockPolicy.ts');
  console.error(e.stdout?.toString() || e.message);
  process.exit(1);
}

const {
  DEFAULT_LOCK_GRACE_MS,
  DEFAULT_SESSION_MAX_IDLE_MS,
  shouldLockOnResume,
  isSessionExpired,
  decideOnResume,
} = require(path.join(out, 'lockPolicy.js'));

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

const NOW = 1_800_000_000_000;
const MIN = 60 * 1000;

// ── The lock is opt-in ───────────────────────────────────────────────────
{
  check(
    'disabled never locks, however long the absence',
    shouldLockOnResume({ enabled: false, backgroundedAt: NOW - 30 * 24 * 60 * MIN, now: NOW }) === false,
  );
}

// ── The grace boundary ───────────────────────────────────────────────────
{
  const base = { enabled: true, now: NOW, graceMs: 5 * MIN };
  check(
    'a glance at a notification does not lock',
    shouldLockOnResume({ ...base, backgroundedAt: NOW - 10 * 1000 }) === false,
  );
  check(
    'one second inside the grace stays unlocked',
    shouldLockOnResume({ ...base, backgroundedAt: NOW - (5 * MIN - 1000) }) === false,
  );
  check(
    'exactly on the grace locks',
    shouldLockOnResume({ ...base, backgroundedAt: NOW - 5 * MIN }) === true,
    'the threshold has been reached, so it has elapsed',
  );
  check(
    'well past the grace locks',
    shouldLockOnResume({ ...base, backgroundedAt: NOW - 60 * MIN }) === true,
  );
}

// ── Never backgrounded ───────────────────────────────────────────────────
{
  check(
    'a fresh launch with no background record does not lock here',
    shouldLockOnResume({ enabled: true, backgroundedAt: null, now: NOW }) === false,
    'launch locking is a separate decision from resume locking',
  );
}

// ── A tampered clock must fail closed ────────────────────────────────────
{
  check(
    'a backgrounded time in the future locks',
    shouldLockOnResume({ enabled: true, backgroundedAt: NOW + 60 * MIN, now: NOW }) === true,
    'winding the clock forward must not skip the lock',
  );
}

// ── Session expiry ───────────────────────────────────────────────────────
{
  check(
    'a session used today is not expired',
    isSessionExpired({ lastActiveAt: NOW - 60 * MIN, now: NOW }) === false,
  );
  check(
    'one second inside the window survives',
    isSessionExpired({ lastActiveAt: NOW - (DEFAULT_SESSION_MAX_IDLE_MS - 1000), now: NOW }) === false,
  );
  check(
    'exactly on the idle limit expires',
    isSessionExpired({ lastActiveAt: NOW - DEFAULT_SESSION_MAX_IDLE_MS, now: NOW }) === true,
  );
  check(
    'a token with no timestamp is NOT expired',
    isSessionExpired({ lastActiveAt: null, now: NOW }) === false,
    'upgrading from an older build must not sign everyone out',
  );
  check(
    'a clock wound backwards does not expire the session',
    isSessionExpired({ lastActiveAt: NOW + 60 * MIN, now: NOW }) === false,
    'a negative idle is not evidence of staleness',
  );
}

// ── The combined decision ────────────────────────────────────────────────
{
  const signedOut = { hasSession: false, enabled: true, backgroundedAt: NOW - 60 * MIN, lastActiveAt: null, now: NOW };
  check('no session means nothing to lock', decideOnResume(signedOut) === 'proceed');

  check(
    'a brief absence proceeds',
    decideOnResume({
      hasSession: true,
      enabled: true,
      backgroundedAt: NOW - 10 * 1000,
      lastActiveAt: NOW - 10 * 1000,
      now: NOW,
    }) === 'proceed',
  );

  check(
    'a long absence locks',
    decideOnResume({
      hasSession: true,
      enabled: true,
      backgroundedAt: NOW - 30 * MIN,
      lastActiveAt: NOW - 30 * MIN,
      now: NOW,
    }) === 'lock',
  );

  check(
    'a stale session signs out rather than locking',
    decideOnResume({
      hasSession: true,
      enabled: true,
      backgroundedAt: NOW - 30 * MIN,
      lastActiveAt: NOW - DEFAULT_SESSION_MAX_IDLE_MS - MIN,
      now: NOW,
    }) === 'signOut',
    'prompting for a fingerprint then bouncing to login is worse than going there',
  );

  check(
    'expiry applies even with the lock switched off',
    decideOnResume({
      hasSession: true,
      enabled: false,
      backgroundedAt: null,
      lastActiveAt: NOW - DEFAULT_SESSION_MAX_IDLE_MS - MIN,
      now: NOW,
    }) === 'signOut',
    'the session clock is not the customer’s to disable',
  );
}

// ── The defaults themselves ──────────────────────────────────────────────
{
  check('lock grace is 5 minutes', DEFAULT_LOCK_GRACE_MS === 5 * 60 * 1000);
  check('session idle limit is 14 days', DEFAULT_SESSION_MAX_IDLE_MS === 14 * 24 * 60 * 60 * 1000);
  check(
    'the lock fires long before the session expires',
    DEFAULT_LOCK_GRACE_MS < DEFAULT_SESSION_MAX_IDLE_MS,
  );
}

fs.rmSync(out, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
