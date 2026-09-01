#!/usr/bin/env node
/**
 * Tests the real `src/security/lockPolicy.ts`.
 *
 * This decides whether a returning customer carries on where they left off or
 * is signed out and sent back to an email OTP. Every interesting case is a
 * boundary — exactly on five minutes, a clock wound backwards, a resume with no
 * recorded background — and none are reachable by tapping through the app at
 * whatever moment you happen to be testing.
 *
 * Wrong in one direction, someone loses their place for glancing at a text.
 * Wrong in the other, a lost phone stays signed in.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'elz-lock-'));
const tscBin = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');
const root = path.join(__dirname, '..');

try {
  execFileSync(
    process.execPath,
    [tscBin, 'src/security/lockPolicy.ts', '--outDir', out, '--module', 'commonjs', '--target', 'es2020'],
    { stdio: 'pipe', cwd: root },
  );
} catch (e) {
  console.error('Could not compile lockPolicy.ts');
  console.error(e.stdout?.toString() || e.message);
  process.exit(1);
}

const { BACKGROUND_TIMEOUT_MS, hasBackgroundTimedOut, decideOnResume, remainingMs } =
  require(path.join(out, 'lockPolicy.js'));

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

// ── The five-minute boundary ─────────────────────────────────────────────
{
  check('the spec value is 300000 ms', BACKGROUND_TIMEOUT_MS === 300_000);

  check(
    'a ten-second glance at a notification does not end the session',
    hasBackgroundTimedOut({ backgroundedAt: NOW - 10 * 1000, now: NOW }) === false,
  );
  check(
    'four minutes fifty-nine seconds survives',
    hasBackgroundTimedOut({ backgroundedAt: NOW - (5 * MIN - 1000), now: NOW }) === false,
  );
  check(
    'exactly five minutes ends the session',
    hasBackgroundTimedOut({ backgroundedAt: NOW - 5 * MIN, now: NOW }) === true,
    '"5 minutes or longer" includes the boundary itself',
  );
  check(
    'well past five minutes ends the session',
    hasBackgroundTimedOut({ backgroundedAt: NOW - 6 * 60 * MIN, now: NOW }) === true,
  );
}

// ── Never backgrounded ───────────────────────────────────────────────────
{
  check(
    'a resume with no recorded background is not a timeout',
    hasBackgroundTimedOut({ backgroundedAt: null, now: NOW }) === false,
    'the app was never away, so nothing elapsed',
  );
}

// ── A tampered clock must fail closed ────────────────────────────────────
{
  check(
    'a background time in the future counts as expired',
    hasBackgroundTimedOut({ backgroundedAt: NOW + 60 * MIN, now: NOW }) === true,
    'the device clock is user-writable; winding it forward must not skip the timeout',
  );
}

// ── The decision the watcher acts on ─────────────────────────────────────
{
  check(
    'nobody signed in means nothing to invalidate',
    decideOnResume({ hasSession: false, backgroundedAt: NOW - 60 * MIN, now: NOW }) === 'restore',
  );
  check(
    'a brief absence restores seamlessly',
    decideOnResume({ hasSession: true, backgroundedAt: NOW - 30 * 1000, now: NOW }) === 'restore',
  );
  check(
    'a long absence signs out',
    decideOnResume({ hasSession: true, backgroundedAt: NOW - 10 * MIN, now: NOW }) === 'signOut',
  );
  check(
    'the boundary signs out',
    decideOnResume({ hasSession: true, backgroundedAt: NOW - 5 * MIN, now: NOW }) === 'signOut',
  );
}

// ── Remaining time ───────────────────────────────────────────────────────
{
  check('a fresh background has the full window', remainingMs({ backgroundedAt: NOW, now: NOW }) === 300_000);
  check(
    'two minutes in leaves three',
    remainingMs({ backgroundedAt: NOW - 2 * MIN, now: NOW }) === 3 * MIN,
  );
  check('past the window leaves zero', remainingMs({ backgroundedAt: NOW - 9 * MIN, now: NOW }) === 0);
  check('never backgrounded reports the full window', remainingMs({ backgroundedAt: null, now: NOW }) === 300_000);
  check(
    'remaining never goes negative',
    remainingMs({ backgroundedAt: NOW - 60 * MIN, now: NOW }) >= 0,
  );
}

// ── Biometrics are gone, and must stay gone ──────────────────────────────
{
  const stripComments = (src) =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  check(
    'expo-local-authentication is not a dependency',
    !JSON.stringify(require(path.join(root, 'package.json')).dependencies).includes('local-authentication'),
  );
  for (const rel of ['src/api/session.ts', 'src/security/lockPolicy.ts', 'src/components/SessionTimeoutWatcher.tsx']) {
    const code = stripComments(fs.readFileSync(path.join(root, rel), 'utf8'));
    check(
      `${rel} triggers no biometric prompt`,
      !/LocalAuthentication|authenticateAsync|requireAuthentication/.test(code),
      'repeated fingerprint prompts are what this change removed',
    );
  }
}

// ── The biometric-bound credentials left on real devices ────────────────
//
// Removing the biometric CODE does not stop the prompt: `requireAuthentication`
// is a property of the stored keystore entry, so an entry written by the
// withdrawn build keeps demanding a fingerprint whatever the new code passes.
// The entry has to be deleted, and the deletion has to happen BEFORE the first
// read — because the read is what raises the prompt.
{
  const src = fs.readFileSync(path.join(root, 'src', 'api', 'session.ts'), 'utf8');

  check(
    'a one-time purge of biometric-bound credentials exists',
    /purgeBiometricBoundCredentials/.test(src),
  );
  check(
    'the purge deletes the access token',
    /deleteItemAsync\(TOKEN_KEY\)/.test(src),
    'rewriting is impossible — reading the value to preserve it is the prompt',
  );
  check(
    'the purge deletes the refresh token',
    /deleteItemAsync\(REFRESH_KEY\)/.test(src),
  );

  // The ordering is the whole fix, so assert it positionally.
  const readRawAt = src.indexOf('async function readRaw');
  const body = src.slice(readRawAt, src.indexOf('async function writeRaw'));
  const purgeAt = body.indexOf('await purgeBiometricBoundCredentials()');
  const getAt = body.indexOf('SecureStore.getItemAsync');
  check(
    'the purge is awaited BEFORE the first credential read',
    purgeAt !== -1 && getAt !== -1 && purgeAt < getAt,
    'reading first would raise the very prompt the purge removes',
  );

  check(
    'the completion marker is written after the deletions',
    src.indexOf('PURGE_DONE_KEY, ') > src.indexOf('deleteItemAsync(TOKEN_KEY)'),
    'a crash midway must leave the cleanup to run again, not look complete',
  );
}

fs.rmSync(out, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
