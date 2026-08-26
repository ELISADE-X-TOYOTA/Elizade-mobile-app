#!/usr/bin/env node
/**
 * Tests the real `src/domain/booking.ts`.
 *
 * Every bug in booking-time code is a boundary bug: the slot exactly on the
 * cutoff, the last slot of the day, the day with nothing left. None of those
 * are reachable by hand at whatever time you happen to be testing, which is
 * why "I clicked through it and it looked fine" does not cover this file.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'elz-book-'));
const tscBin = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');

try {
  execFileSync(
    process.execPath,
    [tscBin, 'src/domain/booking.ts', '--outDir', out, '--module', 'commonjs', '--target', 'es2020'],
    { stdio: 'pipe', cwd: path.join(__dirname, '..') },
  );
} catch (e) {
  console.error('Could not compile booking.ts');
  console.error(e.stdout?.toString() || e.message);
  process.exit(1);
}

const {
  SERVICE_SLOTS,
  LEAD_TIME_MINUTES,
  bookableSlots,
  bookableDays,
  isDayBookable,
  slotDateTime,
  validateBooking,
  isSlotPast,
  isDayFull,
  firstOpenSlot,
  slotTime,
  SLOTS,
} = require(path.join(out, 'booking.js'));

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

/** Local-time constructor, so the tests read as wall-clock times. */
const at = (y, m, d, hh, mm = 0) => new Date(y, m - 1, d, hh, mm, 0, 0);
const labels = (slots) => slots.map((s) => s.label);

// ── The label/time bug that prompted this module ────────────────────────
{
  const tenThirty = SERVICE_SLOTS.find((s) => s.label === '10:30 AM');
  check('the 10:30 slot actually books 10:30', tenThirty.hour === 10 && tenThirty.minute === 30);

  const when = slotDateTime(at(2026, 9, 1, 0), tenThirty);
  check('slotDateTime applies both hour and minute', when.getHours() === 10 && when.getMinutes() === 30);
}

// ── A future day is unrestricted ────────────────────────────────────────
{
  const now = at(2026, 9, 1, 15, 0);
  const tomorrow = at(2026, 9, 2, 0);
  check('a future day offers every slot', bookableSlots(tomorrow, now).length === SERVICE_SLOTS.length);
}

// ── Same-day filtering ──────────────────────────────────────────────────
{
  const today = at(2026, 9, 1, 0);

  // 08:00 + 2h lead = 10:00 cutoff. 9:00 is out; 10:30 onward is in.
  const early = bookableSlots(today, at(2026, 9, 1, 8, 0));
  check('morning drops only the passed slots', JSON.stringify(labels(early)) ===
    JSON.stringify(['10:30 AM', '12:00 PM', '2:00 PM', '4:00 PM']), labels(early).join(','));

  // 13:00 + 2h = 15:00 cutoff. Only 4:00 PM survives.
  const afternoon = bookableSlots(today, at(2026, 9, 1, 13, 0));
  check('afternoon leaves only the late slot', JSON.stringify(labels(afternoon)) === JSON.stringify(['4:00 PM']));

  // Nothing left after the last slot minus the lead.
  const evening = bookableSlots(today, at(2026, 9, 1, 18, 0));
  check('evening leaves nothing today', evening.length === 0);
}

// ── The exact boundary ──────────────────────────────────────────────────
{
  const today = at(2026, 9, 1, 0);
  // Cutoff lands EXACTLY on 12:00. The slot is `>= cutoff`, so it stays.
  const exact = bookableSlots(today, at(2026, 9, 1, 10, 0));
  check('a slot exactly on the cutoff is still offered', labels(exact).includes('12:00 PM'));

  // One minute later and it is gone.
  const justPast = bookableSlots(today, at(2026, 9, 1, 10, 1));
  check('one minute past the cutoff removes it', !labels(justPast).includes('12:00 PM'));
}

// ── Past days ───────────────────────────────────────────────────────────
{
  const now = at(2026, 9, 5, 10, 0);
  check('a past day offers nothing', bookableSlots(at(2026, 9, 1, 0), now).length === 0);
  check('a past day is not bookable', isDayBookable(at(2026, 9, 1, 0), now) === false);
}

// ── Day list ────────────────────────────────────────────────────────────
{
  // Early morning: today still has slots, so it leads the list.
  const morning = bookableDays(7, at(2026, 9, 1, 7, 0));
  check('returns the requested number of days', morning.length === 7);
  check('includes today when today still has slots', morning[0].getDate() === 1);

  // Late evening: today has nothing left, so the list starts tomorrow.
  const evening = bookableDays(7, at(2026, 9, 1, 20, 0));
  check('drops today once it is fully past', evening[0].getDate() === 2, `got ${evening[0].getDate()}`);
  check('still returns a full week', evening.length === 7, `got ${evening.length}`);
  check('never offers an unselectable day', evening.every((d) => isDayBookable(d, at(2026, 9, 1, 20, 0))));
}

// ── Month and year rollover ─────────────────────────────────────────────
{
  const days = bookableDays(7, at(2026, 12, 29, 7, 0));
  check('rolls over the year correctly', days[6].getFullYear() === 2027 && days[6].getMonth() === 0);

  const feb = bookableDays(3, at(2028, 2, 28, 7, 0)); // 2028 is a leap year
  check('handles a leap day', feb[1].getDate() === 29, `got ${feb[1].getDate()}`);
}

// ── Final submit gate ───────────────────────────────────────────────────
{
  const now = at(2026, 9, 1, 12, 0);
  check('rejects a past time', validateBooking(at(2026, 9, 1, 9, 0), now) !== null);
  check('rejects now exactly', validateBooking(now, now) !== null);
  check('rejects inside the lead window', validateBooking(at(2026, 9, 1, 13, 0), now) !== null);
  check('accepts beyond the lead window', validateBooking(at(2026, 9, 1, 15, 0), now) === null);
  check('rejects an invalid date', validateBooking(new Date(NaN), now) !== null);

  const msg = validateBooking(at(2026, 9, 1, 13, 0), now);
  check('the lead-time message names the requirement', /2 hours/.test(msg), msg);
}

// ── The stale-form case this exists for ─────────────────────────────────
{
  // Screen opened at 13:59 (2:00 PM was offered), submitted at 14:05.
  const opened = at(2026, 9, 1, 11, 55);
  const submitted = at(2026, 9, 1, 14, 5);
  const twoPm = at(2026, 9, 1, 14, 0);

  check('the slot was valid when offered', bookableSlots(at(2026, 9, 1, 0), opened).some((s) => s.label === '2:00 PM'));
  check('and is caught at submit time', validateBooking(twoPm, submitted) !== null);
}

// ── The disable-in-place API used by the test-drive screen ──────────────
// Both screens must agree on what is bookable; they only differ in whether a
// passed slot is hidden or shown greyed out.
{
  const today = at(2026, 9, 1, 0);
  const now = at(2026, 9, 1, 13, 0); // cutoff 15:00

  check('isSlotPast agrees with bookableSlots', SLOTS.every((slot, i) => {
    const hidden = !bookableSlots(today, now).some((s) => s.label === slot.label);
    return hidden === isSlotPast(today, i, now);
  }));

  check('isDayFull matches an empty slot list', isDayFull(today, at(2026, 9, 1, 18, 0)) === true);
  check('isDayFull is false while slots remain', isDayFull(today, now) === false);

  check('firstOpenSlot finds the first bookable index', firstOpenSlot(today, now) === 4, `${firstOpenSlot(today, now)}`);
  check('firstOpenSlot returns -1 when nothing is left', firstOpenSlot(today, at(2026, 9, 1, 18, 0)) === -1);
  check('firstOpenSlot is 0 on a future day', firstOpenSlot(at(2026, 9, 2, 0), now) === 0);

  const byIndex = slotTime(today, 1);
  check('slotTime applies hour AND minute', byIndex.getHours() === 10 && byIndex.getMinutes() === 30);
  check('slotTime falls back safely on a bad index', slotTime(today, 99).getHours() === 9);
}

fs.rmSync(out, { recursive: true, force: true });

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
