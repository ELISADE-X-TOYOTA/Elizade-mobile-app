#!/usr/bin/env node
/**
 * Tests the real `src/domain/categories.ts`.
 *
 * The showroom offered all seven category chips unconditionally. The app's
 * `category` is not a backend field — it is GUESSED in `src/api/mappers.ts` by
 * running a regex over make, model and fuel type. Elizade's catalogue is
 * Toyota passenger cars, so across all 30 vehicles in production that guess
 * yields only suv, sedan and pickup.
 *
 * Truck, Sports, Luxury and Electric matched nothing at all — and those are
 * exactly the four QA tapped, each answering "No vehicles match your search".
 *
 * A filter that cannot return a result should not be on screen. The awkward
 * case is the one below about the selected chip: derive the list from the
 * vehicles on screen and the active chip can derive itself out of existence,
 * stranding the user inside a filter with no way to switch it off.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'elz-cats-'));
const tscBin = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');

try {
  execFileSync(
    process.execPath,
    [
      tscBin,
      'src/domain/categories.ts',
      '--outDir',
      out,
      '--module',
      'commonjs',
      '--target',
      'es2020',
      // `types.ts` reaches react-native's and node's ambient declarations,
      // which conflict inside node_modules. Check our source, not theirs.
      '--skipLibCheck',
    ],
    { stdio: 'pipe', cwd: path.join(__dirname, '..') },
  );
} catch (e) {
  console.error('Could not compile categories.ts');
  console.error(e.stdout?.toString() || e.message);
  process.exit(1);
}

const { availableCategories } = require(path.join(out, 'domain', 'categories.js'));

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

const v = (category) => ({ category });

/** What the regex actually produces for the real production catalogue. */
const PRODUCTION_SHAPED = [
  ...Array(10).fill(v('suv')),
  ...Array(18).fill(v('sedan')),
  ...Array(2).fill(v('pickup')),
];

console.log('\nthe reported dead ends');
{
  const cats = availableCategories(PRODUCTION_SHAPED, null);
  for (const empty of ['truck', 'sports', 'luxury', 'electric']) {
    check(`${empty} is not offered`, !cats.includes(empty), cats.join(', '));
  }
  for (const stocked of ['suv', 'sedan', 'pickup']) {
    check(`${stocked} is offered`, cats.includes(stocked), cats.join(', '));
  }
  check('exactly the three stocked categories', cats.length === 3, cats.join(', '));
}

console.log('\nthe selected chip can never strand the user');
{
  // Selecting a category filters the list the chips are derived from, so the
  // active chip can vanish and leave no way to clear the filter.
  const onlySuvsLeft = [v('suv')];
  const cats = availableCategories(onlySuvsLeft, 'sedan');
  check('the active chip survives an empty result', cats.includes('sedan'), cats.join(', '));
  check('and is not duplicated', cats.filter((c) => c === 'sedan').length === 1, cats.join(', '));
}
{
  const cats = availableCategories([], 'luxury');
  check('active chip survives a completely empty list', cats.includes('luxury'), cats.join(', '));
}

console.log('\nit follows the catalogue, not a hardcoded list');
{
  check(
    'an electric arrival brings its chip back on its own',
    availableCategories([...PRODUCTION_SHAPED, v('electric')], null).includes('electric'),
  );
  check(
    'nothing stocked, nothing offered',
    availableCategories([], null).length === 0,
  );
}

console.log('\nordering and shape');
{
  const cats = availableCategories(PRODUCTION_SHAPED, null);
  // CATEGORY_META order is suv, sedan, electric, luxury, sports, pickup, truck.
  check('chips keep the catalogue order', cats.join(',') === 'suv,sedan,pickup', cats.join(','));
  check('no duplicates from repeated vehicles', new Set(cats).size === cats.length);
  check('undefined selection is allowed', Array.isArray(availableCategories(PRODUCTION_SHAPED)));
  check(
    'an unknown category on a vehicle is ignored',
    !availableCategories([{ category: 'spaceship' }], null).includes('spaceship'),
  );
}

fs.rmSync(out, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
