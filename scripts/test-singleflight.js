#!/usr/bin/env node
/**
 * Tests the real `src/api/singleFlight.ts` by compiling it and exercising it.
 *
 * There is no JS test runner in this project, and adding jest-expo for one
 * module would be a heavy dependency for a small amount of code. But this
 * particular module is worth testing: it is what stops the app from logging
 *ITSELF out. Concurrent refreshes present an already-rotated token, the
 * backend reads that as theft and revokes the whole family — so a bug here
 * turns "renew my session" into "sign the customer out".
 *
 * The module is deliberately free of React Native imports so `tsc` can emit it
 * standalone and plain Node can run it. This tests the shipped code, not a
 * hand-written copy of it that could drift.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'elz-sf-'));

// The tsc entry script is invoked through node directly. Going via `npx` fails
// with EINVAL on Windows under execFileSync, and a shell:true call would need
// quoting that differs per platform.
const tscBin = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');

try {
  execFileSync(
    process.execPath,
    [tscBin, 'src/api/singleFlight.ts', '--outDir', out, '--module', 'commonjs', '--target', 'es2020'],
    { stdio: 'pipe', cwd: path.join(__dirname, '..') },
  );
} catch (e) {
  console.error('Could not compile singleFlight.ts');
  console.error(e.stdout?.toString() || e.message);
  process.exit(1);
}

const { singleFlight } = require(path.join(out, 'singleFlight.js'));

let pass = 0;
let fail = 0;
const check = (name, cond) => {
  if (cond) {
    pass++;
    console.log(`  ok   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}`);
  }
};

(async () => {
  // The core guarantee: a burst of callers must produce ONE operation.
  let runs = 0;
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  const op = singleFlight(async () => {
    runs++;
    await gate;
    return `v${runs}`;
  });
  const all = [op(), op(), op(), op(), op()];
  release();
  const results = await Promise.all(all);
  check('5 concurrent callers -> 1 operation', runs === 1);
  check('all callers get the same result', results.every((r) => r === 'v1'));

  // A later expiry must start a fresh attempt, not replay a stale result.
  await op();
  check('a call after settle re-runs', runs === 2);

  // One failed refresh must not wedge the slot forever.
  let attempts = 0;
  const flaky = singleFlight(async () => {
    attempts++;
    if (attempts === 1) throw new Error('boom');
    return 'ok';
  });
  await flaky().catch(() => {});
  const recovered = await flaky();
  check('rejection releases the slot', recovered === 'ok' && attempts === 2);

  // Every waiter must observe a shared failure, not hang.
  let failRuns = 0;
  let rel2;
  const g2 = new Promise((r) => {
    rel2 = r;
  });
  const alwaysFails = singleFlight(async () => {
    failRuns++;
    await g2;
    throw new Error('nope');
  });
  const settled = Promise.allSettled([alwaysFails(), alwaysFails(), alwaysFails()]);
  rel2();
  const outcomes = await settled;
  check('concurrent failures share one operation', failRuns === 1);
  check('every caller sees the rejection', outcomes.every((o) => o.status === 'rejected'));

  fs.rmSync(out, { recursive: true, force: true });

  console.log(`\n  ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
