#!/usr/bin/env node
/**
 * Tests the real `src/domain/bookings.ts`.
 *
 * The Bookings tab used to be backed solely by `GET /sales/test-drives`, so a
 * service appointment was simply not there — it lived in the Service tab, and
 * a customer looking at a screen called "Bookings" saw half of theirs. Both
 * feeds are merged now, which introduces three rules that all fail QUIETLY:
 *
 *   * the upcoming/past split, per kind. A status left out of the "upcoming"
 *     set does not throw — it files a live booking under a tab nobody opens.
 *     `in_progress` and `awaiting_approval` are the dangerous ones: a car in
 *     the workshop, and one waiting on the customer to approve extra work.
 *   * ordering. Unsorted, every test drive sits above every service visit
 *     regardless of date, which reads as a broken list.
 *   * key collisions. The two ids come from different tables and nothing
 *     guarantees they differ; an unprefixed key lets one row silently replace
 *     another.
 *
 * None of it is reachable by clicking through the app without first arranging
 * a customer who has both kinds of booking spanning past and future.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'elz-bookings-'));
const tscBin = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');

try {
  execFileSync(
    process.execPath,
    [
      tscBin,
      'src/domain/bookings.ts',
      '--outDir',
      out,
      '--module',
      'commonjs',
      '--target',
      'es2020',
      // `bookings.ts` imports `./types`, which reaches `../api/leads` and from
      // there drags in react-native's and node's ambient declarations. They
      // conflict with each other inside node_modules, which has nothing to do
      // with this module — check our own source, not theirs.
      '--skipLibCheck',
    ],
    { stdio: 'pipe', cwd: path.join(__dirname, '..') },
  );
} catch (e) {
  console.error('Could not compile bookings.ts');
  console.error(e.stdout?.toString() || e.message);
  process.exit(1);
}

const { selectBookings, fromTestDrive, fromAppointment } = require(
  path.join(out, 'domain', 'bookings.js'),
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

const drive = (over = {}) => ({
  id: 'td1',
  vehicleId: 'v1',
  vehicleLabel: '2024 Toyota Corolla',
  branchId: 'b1',
  branchName: 'Elizade Ikeja',
  scheduledAt: '2026-09-10T10:00:00Z',
  status: 'requested',
  leadId: 'lead-1',
  createdAt: '2026-09-01T10:00:00Z',
  ...over,
});

const appt = (over = {}) => ({
  id: 'sa1',
  vehicleId: 'ov1',
  vehicleTitle: 'Toyota Hilux',
  vehicleImage: '',
  branchName: 'Elizade Victoria Island',
  serviceType: 'periodic',
  scheduledAt: '2026-09-09T09:00:00Z',
  status: 'confirmed',
  issueDescription: '',
  mileageAtBooking: 42000,
  ...over,
});

const keys = (items) => items.map((i) => i.key);
const kinds = (items) => items.map((i) => i.kind);

// ── Both kinds are actually there ────────────────────────────────────
console.log('\nbookings means both kinds, not just test drives');
{
  const items = selectBookings([drive()], [appt()], true);
  check('a service appointment reaches the list', kinds(items).includes('service'), kinds(items));
  check('and so does a test drive', kinds(items).includes('testDrive'), kinds(items));
  check('two bookings, two rows', items.length === 2, String(items.length));
}

console.log('\neach row says which kind it is');
{
  check('a test drive is labelled', fromTestDrive(drive()).kind === 'testDrive');
  check('a service is labelled', fromAppointment(appt()).kind === 'service');
}

// ── The split ────────────────────────────────────────────────────────
console.log('\nupcoming vs past, per kind');
for (const [status, expected] of [
  ['requested', true],
  ['confirmed', true],
  ['completed', false],
  ['cancelled', false],
]) {
  check(
    `test drive "${status}" is ${expected ? 'upcoming' : 'past'}`,
    fromTestDrive(drive({ status })).upcoming === expected,
  );
}
for (const [status, expected] of [
  ['requested', true],
  ['confirmed', true],
  ['in_progress', true],
  ['awaiting_approval', true],
  ['completed', false],
  ['cancelled', false],
]) {
  check(
    `service "${status}" is ${expected ? 'upcoming' : 'past'}`,
    fromAppointment(appt({ status })).upcoming === expected,
  );
}
{
  // The two that matter most: a car in the workshop, and one waiting on the
  // customer. Filing either under "Past" hides the live thing.
  const live = selectBookings([], [appt({ id: 'a', status: 'in_progress' }), appt({ id: 'b', status: 'awaiting_approval' })], true);
  check('a car in the workshop stays visible', live.length === 2, String(live.length));
}

// ── Ordering ─────────────────────────────────────────────────────────
console.log('\nordered by date, with the kinds interleaved');
{
  const items = selectBookings(
    [drive({ id: 'late', scheduledAt: '2026-09-20T10:00:00Z' })],
    [appt({ id: 'soon', scheduledAt: '2026-09-11T09:00:00Z' })],
    true,
  );
  check(
    'the sooner service outranks the later test drive',
    keys(items)[0] === 'service-soon',
    keys(items).join(', '),
  );
}
{
  // Three rows alternating by date — the case that proves it is really
  // sorting rather than concatenating.
  const items = selectBookings(
    [
      drive({ id: 'first', scheduledAt: '2026-09-05T10:00:00Z' }),
      drive({ id: 'third', scheduledAt: '2026-09-15T10:00:00Z' }),
    ],
    [appt({ id: 'second', scheduledAt: '2026-09-10T09:00:00Z' })],
    true,
  );
  check(
    'upcoming runs soonest first',
    keys(items).join(',') === 'test-drive-first,service-second,test-drive-third',
    keys(items).join(', '),
  );
}
{
  const items = selectBookings(
    [
      drive({ id: 'older', status: 'completed', scheduledAt: '2026-08-01T10:00:00Z' }),
      drive({ id: 'newer', status: 'completed', scheduledAt: '2026-08-20T10:00:00Z' }),
    ],
    [appt({ id: 'middle', status: 'completed', scheduledAt: '2026-08-10T09:00:00Z' })],
    false,
  );
  check(
    'past runs most recent first',
    keys(items).join(',') === 'test-drive-newer,service-middle,test-drive-older',
    keys(items).join(', '),
  );
}

// ── Keys ─────────────────────────────────────────────────────────────
console.log('\nkeys cannot collide across the two tables');
{
  const items = selectBookings([drive({ id: 'shared' })], [appt({ id: 'shared' })], true);
  check('an id used by both kinds yields two rows', items.length === 2, String(items.length));
  check('with distinct keys', new Set(keys(items)).size === 2, keys(items).join(', '));
}

// ── Where a row opens ────────────────────────────────────────────────
console.log('\nwhat each row points at');
{
  check(
    'a test drive points at its LEAD, not the booking',
    fromTestDrive(drive({ id: 'td9', leadId: 'lead-42' })).targetId === 'lead-42',
  );
  check(
    'a test drive with no lead has nothing to open',
    fromTestDrive(drive({ leadId: null })).targetId === null,
  );
  check(
    'a service points at the appointment',
    fromAppointment(appt({ id: 'sa9' })).targetId === 'sa9',
  );
}

console.log('\nthe live lead stage wins over the frozen booking status');
{
  // `status` never advances — it is written once and never touched, which is
  // why a customer watched a request sit on "Requested" while it was being
  // worked.
  const item = fromTestDrive(drive({ status: 'requested', leadStageLabel: 'Test Drive Booked' }));
  check('the lead stage is shown', item.statusLabel === 'Test Drive Booked', item.statusLabel);
}
{
  const item = fromTestDrive(drive({ status: 'requested', leadStageLabel: null }));
  check('falling back to the status when there is no lead stage',
    item.statusLabel === 'Requested', item.statusLabel);
}

console.log('\nempty and one-sided inputs');
{
  check('nothing booked', selectBookings([], [], true).length === 0);
  check('test drives only still works', selectBookings([drive()], [], true).length === 1);
  check('services only still works', selectBookings([], [appt()], true).length === 1);
}

fs.rmSync(out, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
