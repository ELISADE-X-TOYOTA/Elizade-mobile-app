#!/usr/bin/env node
/**
 * Tests the real `src/data/socketBackoff.ts`.
 *
 * Reconnect timing is the part of a realtime client that fails in a way you
 * never see in development: with one phone on a fast laptop connection, every
 * backoff policy looks identical. The damage shows up only when a few thousand
 * clients drop at the same instant, which is exactly when you cannot debug it.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'elz-ws-'));
const tscBin = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');

try {
  execFileSync(
    process.execPath,
    [tscBin, 'src/data/socketBackoff.ts', '--outDir', out, '--module', 'commonjs', '--target', 'es2020'],
    { stdio: 'pipe', cwd: path.join(__dirname, '..') },
  );
} catch (e) {
  console.error('Could not compile socketBackoff.ts');
  console.error(e.stdout?.toString() || e.message);
  process.exit(1);
}

const { reconnectDelay, toWebSocketUrl, resumeFrom, BASE_DELAY_MS, MAX_DELAY_MS } = require(
  path.join(out, 'socketBackoff.js'),
);

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

// ── Backoff growth ──────────────────────────────────────────────────────
{
  // random() === 1 gives the top of the jitter range, i.e. the raw curve.
  const top = (n) => reconnectDelay(n, () => 1);
  check('first retry is the base delay', top(0) === BASE_DELAY_MS, `${top(0)}`);
  check('delay doubles each attempt', top(1) === 2000 && top(2) === 4000 && top(3) === 8000);
  check('delay is capped', top(20) === MAX_DELAY_MS, `${top(20)}`);
  check('cap is never exceeded', [...Array(50).keys()].every((n) => top(n) <= MAX_DELAY_MS));
}

// ── Jitter ──────────────────────────────────────────────────────────────
{
  check('jitter can reach zero', reconnectDelay(5, () => 0) === 0);
  check('jitter spans the full window', reconnectDelay(3, () => 0.5) === 4000);

  // The property that matters: many clients failing together must NOT retry
  // at the same moment.
  const sample = [...Array(500)].map(() => reconnectDelay(4));
  const unique = new Set(sample).size;
  check('500 clients get spread out, not synchronised', unique > 100, `only ${unique} distinct delays`);
  check('every jittered delay is within the cap', sample.every((d) => d >= 0 && d <= MAX_DELAY_MS));
}

// ── Negative / defensive input ──────────────────────────────────────────
{
  check('a negative attempt does not invert the delay', reconnectDelay(-5, () => 1) === BASE_DELAY_MS);
}

// ── URL scheme ──────────────────────────────────────────────────────────
{
  check(
    'https becomes wss',
    toWebSocketUrl('https://api.example.com', '/support/ws/tickets/1') ===
      'wss://api.example.com/support/ws/tickets/1',
  );
  check(
    'http becomes ws',
    toWebSocketUrl('http://10.0.2.2:8000', '/x') === 'ws://10.0.2.2:8000/x',
  );
  check(
    'a trailing slash does not double up',
    toWebSocketUrl('https://api.example.com/', '/x') === 'wss://api.example.com/x',
  );
  check(
    'a missing leading slash is added',
    toWebSocketUrl('https://api.example.com', 'x') === 'wss://api.example.com/x',
  );
  // A blunt string replace of "http" would corrupt this.
  check(
    'only the leading scheme is rewritten',
    toWebSocketUrl('https://api.example.com/http-proxy', '/x') ===
      'wss://api.example.com/http-proxy/x',
  );
}

// ── Resume point ────────────────────────────────────────────────────────
{
  check('resumes from the newest timestamp', resumeFrom([
    '2026-08-01T10:00:00Z',
    '2026-08-01T12:00:00Z',
    '2026-08-01T11:00:00Z',
  ]) === '2026-08-01T12:00:00Z');

  check('an empty thread resumes from nothing', resumeFrom([]) === undefined);
  check('blank timestamps are ignored', resumeFrom(['', '2026-08-01T10:00:00Z']) === '2026-08-01T10:00:00Z');
  check('all-blank yields undefined', resumeFrom(['', '']) === undefined);
  check(
    'sub-second precision is preserved',
    resumeFrom(['2026-08-01T10:00:00.100Z', '2026-08-01T10:00:00.900Z']) === '2026-08-01T10:00:00.900Z',
  );
}

fs.rmSync(out, { recursive: true, force: true });

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
