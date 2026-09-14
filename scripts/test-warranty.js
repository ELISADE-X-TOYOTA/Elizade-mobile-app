#!/usr/bin/env node
/**
 * Tests the real `src/domain/warranty.ts`.
 *
 * The claim sheet used to be handed `OWNED_VEHICLES[0].id` from the mock data
 * — the string 'ov1' — on every phone, in production. The certificate card
 * above it was real; the claim filed beneath it never could be. QA found it
 * on 12 September as "That identifier is not valid." three times in a row.
 *
 * This pins the replacement: the vehicle comes from the customer's garage,
 * and when they have more than one, the covered one is preselected.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'elz-wty-'));
const tscBin = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');

try {
  execFileSync(
    process.execPath,
    [tscBin, 'src/domain/warranty.ts', '--outDir', out, '--module', 'commonjs',
     '--target', 'es2020', '--skipLibCheck'],
    { stdio: 'pipe', cwd: path.join(__dirname, '..') },
  );
} catch (e) {
  console.error('Could not compile warranty.ts');
  console.error(e.stdout?.toString() || e.message);
  process.exit(1);
}

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

const compiled = locate(out, 'warranty.js');
if (!compiled) {
  console.error('compiled warranty.js not found under', out);
  process.exit(1);
}
const { preferredClaimVehicleIndex } = require(compiled);

let pass = 0;
let fail = 0;
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
};

const a = { id: 'a1b2c3d4-0000-4000-8000-000000000001' };
const b = { id: 'a1b2c3d4-0000-4000-8000-000000000002' };

console.log('\nan empty garage has nothing to file against');
{
  check('no vehicles gives -1, not 0', preferredClaimVehicleIndex([], []) === -1);
  check('no vehicles gives -1 even with stray certificates',
    preferredClaimVehicleIndex([], [{ vehicleId: a.id, status: 'active' }]) === -1);
}

console.log('\none car is the car');
{
  check('single vehicle, no certificate', preferredClaimVehicleIndex([a], []) === 0);
  check('single vehicle, expired certificate',
    preferredClaimVehicleIndex([a], [{ vehicleId: a.id, status: 'expired' }]) === 0);
}

console.log('\nwith two cars, the covered one is preselected');
{
  check('active cover on the second car picks the second',
    preferredClaimVehicleIndex([a, b], [{ vehicleId: b.id, status: 'active' }]) === 1);
  check('extended cover counts as covered',
    preferredClaimVehicleIndex([a, b], [{ vehicleId: b.id, status: 'extended' }]) === 1);
  check('expired cover does not',
    preferredClaimVehicleIndex([a, b], [{ vehicleId: b.id, status: 'expired' }]) === 0);
  check('both covered picks the first',
    preferredClaimVehicleIndex([a, b], [
      { vehicleId: b.id, status: 'active' }, { vehicleId: a.id, status: 'active' },
    ]) === 0);
  check('a certificate for a car not in the garage is ignored',
    preferredClaimVehicleIndex([a, b], [{ vehicleId: 'ov1', status: 'active' }]) === 0);
}

fs.rmSync(out, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
