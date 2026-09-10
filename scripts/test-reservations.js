#!/usr/bin/env node
/**
 * Tests the real `src/domain/reservations.ts`.
 *
 * The customer reads a reference off this screen and quotes it to the branch,
 * who look the same reservation up from the confirmation email. The two are
 * derived independently — one in TypeScript, one in Python — so they can drift
 * without anything failing, and the first sign would be a customer standing at
 * a counter with a code nobody can find. The format is pinned here against the
 * backend's `_reservation_reference`.
 *
 * The status vocabulary matters for a subtler reason: `pending` means the hold
 * is live and NOTHING has been paid. The app used to render that state as
 * "Deposit Paid" beside the amount, on a screen headed "Vehicle Reserved!".
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'elz-res-'));
const tscBin = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');

try {
  execFileSync(
    process.execPath,
    [tscBin, 'src/domain/reservations.ts', '--outDir', out, '--module', 'commonjs',
     '--target', 'es2020', '--skipLibCheck'],
    { stdio: 'pipe', cwd: path.join(__dirname, '..') },
  );
} catch (e) {
  console.error('Could not compile reservations.ts');
  console.error(e.stdout?.toString() || e.message);
  process.exit(1);
}

// `reservations.ts` imports nothing from the project, so tsc emits it at the
// output root rather than mirroring `src/domain/`. Located rather than assumed,
// because the layout changes the moment the module gains an import.
function locate(dir, name) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = locate(full, name);
      if (found) return found;
    } else if (entry.name === name) {
      return full;
    }
  }
  return null;
}

const compiled = locate(out, 'reservations.js');
if (!compiled) {
  console.error('compiled reservations.js not found under', out);
  process.exit(1);
}
const { reservationReference, isActiveReservation, RESERVATION_STATUS_META } = require(compiled);

let pass = 0;
let fail = 0;
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
};

console.log('\nthe reference must match what the email prints');
{
  // Backend: f"ELZ-{id.replace('-','')[:6].upper()}"
  const id = '3789abcd-1234-4567-89ab-cdef01234567';
  check('same first six hex characters, uppercased',
    reservationReference(id) === 'ELZ-3789AB', reservationReference(id));
  check('dashes are stripped before slicing, not after',
    reservationReference('ab-cdef-0123') === 'ELZ-ABCDEF', reservationReference('ab-cdef-0123'));
  check('already-uppercase ids are unchanged',
    reservationReference('ABCDEF01-0000') === 'ELZ-ABCDEF');
  check('a short id does not throw', typeof reservationReference('ab') === 'string');
}

console.log('\nheld is not paid');
{
  check('pending reads as held, not paid',
    RESERVATION_STATUS_META.pending.labelKey === 'reservations.statusHeld',
    RESERVATION_STATUS_META.pending.labelKey);
  check('deposit_paid is its own state',
    RESERVATION_STATUS_META.deposit_paid.labelKey === 'reservations.statusDepositPaid');
  check('every status has a label and tone',
    ['pending', 'deposit_paid', 'confirmed', 'cancelled', 'expired'].every(
      (s) => RESERVATION_STATUS_META[s] && RESERVATION_STATUS_META[s].labelKey && RESERVATION_STATUS_META[s].tone));
}

console.log('\nwhich holds are still live');
{
  check('a pending hold is active', isActiveReservation('pending'));
  check('a paid deposit is active', isActiveReservation('deposit_paid'));
  check('a confirmed sale is active', isActiveReservation('confirmed'));
  check('cancelled is not', !isActiveReservation('cancelled'));
  check('expired is not', !isActiveReservation('expired'));
}

fs.rmSync(out, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
