#!/usr/bin/env node
/**
 * Tests the real `src/domain/compare.ts` against the shapes a live API
 * actually returns.
 *
 * The compare screen crashes in the field but not in development, which is
 * the signature of a data-shape problem: seeded demo vehicles are complete,
 * real inventory records are not. So these cases feed it vehicles with
 * missing specs, absent arrays and null columns rather than tidy fixtures.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'elz-cmp-'));
const tscBin = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');

// compare.ts reaches utils/format -> constants/app, which reads the React
// Native global __DEV__. Declared in a throwaway file so the module compiles
// standalone; it changes nothing about what is under test.
const globalsDts = path.join(out, 'rn-globals.d.ts');
fs.writeFileSync(globalsDts, 'declare const __DEV__: boolean;\n');

try {
  execFileSync(
    process.execPath,
    [
      tscBin,
      'src/domain/compare.ts',
      globalsDts,
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2020',
      '--skipLibCheck',
      '--moduleResolution', 'node',
    ],
    { stdio: 'pipe', cwd: root },
  );
} catch (e) {
  console.error('Could not compile compare.ts');
  console.error(e.stdout?.toString() || e.message);
  process.exit(1);
}

/*
  Stub `constants/app`.

  compare.ts -> utils/format -> constants/app, and that last one imports
  `expo-constants`, which does not resolve outside a React Native runtime.
  `format` only reads `APP.currency` from it, so a two-line stand-in lets the
  real comparison logic run under plain Node without changing any of it.
*/
fs.mkdirSync(path.join(out, 'constants'), { recursive: true });
fs.writeFileSync(
  path.join(out, 'constants', 'app.js'),
  'exports.APP = { currency: "NGN ", useMock: false, apiBaseUrl: "" };\n',
);

const { buildComparison, onlyDifferences } = require(path.join(out, 'domain', 'compare.js'));

let pass = 0;
let fail = 0;
const check = (name, fn) => {
  try {
    fn();
    pass++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    fail++;
    console.log(`  FAIL ${name} — ${e.message}`);
  }
};

/** A complete vehicle, as the seed data produces. */
const full = (over = {}) => ({
  id: 'v1',
  make: 'Toyota',
  model: 'Corolla',
  trim: 'XLE',
  year: 2024,
  price: 32000000,
  color: 'Pearl White',
  engine: '2.0L',
  transmission: 'CVT',
  fuelType: 'Petrol',
  mileage: 0,
  location: 'Ikeja',
  images: ['https://example.com/a.jpg'],
  specs: { power: '169 hp', torque: '151 Nm', 'seating capacity': '5' },
  ...over,
});

// ── The shapes a real record can arrive in ──────────────────────────────

check('two complete vehicles build a matrix', () => {
  const c = buildComparison(full(), full({ id: 'v2', trim: 'LE' }));
  if (!c.groups.length) throw new Error('no groups');
  if (typeof c.totalRows !== 'number') throw new Error('no totalRows');
});

check('a vehicle with NO specs bag', () => {
  buildComparison(full({ specs: undefined }), full({ id: 'v2' }));
});

check('a vehicle with a null specs bag', () => {
  buildComparison(full({ specs: null }), full({ id: 'v2' }));
});

check('both vehicles missing specs', () => {
  buildComparison(full({ specs: undefined }), full({ id: 'v2', specs: undefined }));
});

check('null scalar columns', () => {
  buildComparison(
    full({ trim: null, engine: null, color: null, location: null, transmission: null, fuelType: null }),
    full({ id: 'v2' }),
  );
});

check('undefined scalar columns', () => {
  buildComparison(
    full({ trim: undefined, engine: undefined, price: undefined, year: undefined }),
    full({ id: 'v2' }),
  );
});

check('a null price (unpublished)', () => {
  buildComparison(full({ price: null }), full({ id: 'v2', price: null }));
});

check('a null mileage', () => {
  buildComparison(full({ mileage: null }), full({ id: 'v2', mileage: undefined }));
});

check('specs holding null and numeric values', () => {
  buildComparison(
    full({ specs: { power: null, torque: 151, seating: undefined, extra: 0 } }),
    full({ id: 'v2' }),
  );
});

check('a specs bag that is an array (bad seed data)', () => {
  buildComparison(full({ specs: [] }), full({ id: 'v2' }));
});

check('a specs bag that is a string (bad seed data)', () => {
  buildComparison(full({ specs: 'n/a' }), full({ id: 'v2' }));
});

check('placeholder dashes are treated as unknown, so the row is dropped', () => {
  // Neither side publishes a trim, and `buildComparison` deliberately removes
  // rows where both values are unknown — an all-blank line teaches nothing.
  const c = buildComparison(full({ trim: '—' }), full({ id: 'v2', trim: '-' }));
  const trimRow = c.groups.flatMap((g) => g.rows).find((r) => r.label === 'Trim');
  if (trimRow) throw new Error('a row with two placeholder values was kept');
});

check('one real trim against a placeholder is still shown', () => {
  // Only ONE side missing is a real finding, so this row must survive.
  const c = buildComparison(full({ trim: 'XLE' }), full({ id: 'v2', trim: '—' }));
  const trimRow = c.groups.flatMap((g) => g.rows).find((r) => r.label === 'Trim');
  if (!trimRow) throw new Error('a one-sided row was dropped');
  if (trimRow.comparable) throw new Error('a missing value was counted as comparable');
});

check('comparing a vehicle with itself yields no differences', () => {
  const v = full();
  const c = buildComparison(v, { ...v, id: 'v2' });
  if (c.differenceCount !== 0) throw new Error(`${c.differenceCount} phantom differences`);
});

check('onlyDifferences survives a comparison with none', () => {
  const v = full();
  const groups = onlyDifferences(buildComparison(v, { ...v, id: 'v2' }));
  if (!Array.isArray(groups)) throw new Error('did not return an array');
});

check('onlyDifferences on wholly-unknown vehicles', () => {
  const bare = { id: 'x', make: 'A', model: 'B', images: [] };
  onlyDifferences(buildComparison(bare, { ...bare, id: 'y' }));
});

// ── The extreme: an almost-empty record ─────────────────────────────────

check('a nearly empty vehicle object', () => {
  const bare = { id: 'x', images: [] };
  buildComparison(bare, { ...bare, id: 'y' });
});

check('an empty object', () => {
  buildComparison({}, {});
});

fs.rmSync(out, { recursive: true, force: true });

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
