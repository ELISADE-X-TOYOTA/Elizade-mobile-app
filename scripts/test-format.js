#!/usr/bin/env node
/**
 * Tests the real `src/utils/format.ts`.
 *
 * THE BUG THIS EXISTS TO PREVENT: price tags that render correctly in Expo Go
 * and come out BLANK in a release .apk / .ipa. Hermes ships without the full
 * ICU dataset, so `Intl.NumberFormat(locale, { style: 'currency' })` returns an
 * empty string or throws in a bundled build, and `toLocaleString(locale)`
 * quietly drops thousands separators. Neither is visible in development, which
 * is exactly why it reached production.
 *
 * So these assertions check EXACT output, not "it produced something". A
 * formatter that returns '' passes any test that only checks for truthiness of
 * the call, and '' is the failure we are guarding against.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'elz-fmt-'));
const tscBin = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');
const root = path.join(__dirname, '..');

// `format.ts` reaches `constants/app.ts`, which reads the React Native global
// `__DEV__`. Declaring it here keeps the module compilable outside Metro
// without the source having to know it is being tested.
const shim = path.join(out, 'rn-globals.d.ts');
fs.writeFileSync(shim, 'declare const __DEV__: boolean;\n');

try {
  execFileSync(
    process.execPath,
    [tscBin, 'src/utils/format.ts', shim, '--outDir', out, '--module', 'commonjs',
     '--target', 'es2020', '--skipLibCheck', '--moduleResolution', 'node'],
    { stdio: 'pipe', cwd: root },
  );
} catch (e) {
  console.error('Could not compile format.ts');
  console.error(e.stdout?.toString() || e.message);
  process.exit(1);
}

// `__DEV__` exists at runtime in Metro; provide it for the compiled module.
// True, because `constants/app.ts` deliberately throws on a RELEASE build with
// no API URL configured — a guard worth keeping, and not this test's subject.
global.__DEV__ = true;

/*
  `constants/app.ts` imports expo-constants, which cannot resolve from the temp
  output directory and needs a native module anyway. Stubbing it keeps this test
  about FORMATTING — the thing that broke in production — rather than dragging
  in the Expo runtime to check where a comma goes.
*/
const stubDir = path.join(out, 'node_modules', 'expo-constants');
fs.mkdirSync(stubDir, { recursive: true });
fs.writeFileSync(
  path.join(stubDir, 'index.js'),
  'module.exports = { __esModule: true, default: { expoConfig: { version: "1.0.0" } } };\n',
);
fs.writeFileSync(
  path.join(stubDir, 'package.json'),
  JSON.stringify({ name: 'expo-constants', version: '0.0.0', main: 'index.js' }),
);

const { naira, price, priceCompact, mileage, mileageOrNull, groupNumber, toAmount } =
  require(path.join(out, 'utils', 'format.js'));

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
const eq = (name, actual, expected) =>
  check(name, actual === expected, `got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);

// ── Grouping is done by hand, so it is identical in every engine ─────────
eq('groups thousands', naira(24780), '₦24,780');
eq('groups hundreds of thousands', naira(148000), '₦148,000');
eq('groups millions', naira(1234567), '₦1,234,567');
eq('leaves sub-thousand alone', naira(750), '₦750');
eq('exactly one thousand', naira(1000), '₦1,000');
eq('boundary at four digits', naira(9999), '₦9,999');
eq('boundary at seven digits', naira(1000000), '₦1,000,000');
eq('zero is a real price, not a missing one', naira(0), '₦0');

// ── Money arrives from THIS backend as a string ──────────────────────────
eq('a decimal string from the API', naira('24780.00'), '₦24,780');
eq('a plain numeric string', naira('148000'), '₦148,000');
eq('rounds, rather than truncating', naira('24780.60'), '₦24,781');
eq('strips a stray currency symbol', naira('₦24,780.00'), '₦24,780');

// ── The blank/NaN cases that reach customers ────────────────────────────
eq('null renders a dash, not blank', naira(null), '—');
eq('undefined renders a dash', naira(undefined), '—');
eq('empty string renders a dash', naira(''), '—');
eq('a non-numeric string renders a dash', naira('unavailable'), '—');
eq('NaN renders a dash, never "₦NaN"', naira(NaN), '—');
eq('Infinity renders a dash', naira(Infinity), '—');

check(
  'a missing price is never blank',
  [null, undefined, '', NaN, 'x'].every((v) => naira(v).length > 0),
  'a blank tag reads as a layout bug; a dash reads as "not priced"',
);
check(
  'a missing price is never zero',
  [null, undefined, '', NaN].every((v) => naira(v) !== '₦0'),
  '₦0 reads as free',
);

// ── Negatives ────────────────────────────────────────────────────────────
eq('a credit keeps its sign', naira(-24780), '-₦24,780');

// ── price() is the legacy alias and must be just as defensive ───────────
eq('price(null) does not produce ₦NaN', price(null), '—');
eq('price passes through to naira', price(148000), '₦148,000');

// ── Compact ─────────────────────────────────────────────────────────────
eq('compact millions', priceCompact(1_500_000), '₦1.5M');
eq('compact thousands', priceCompact(148_000), '₦148k');
eq('compact leaves small amounts intact', priceCompact(750), '₦750');
eq('compact handles null', priceCompact(null), '—');

// ── Mileage ─────────────────────────────────────────────────────────────
eq('mileage groups', mileage(100000), '100,000 km');
eq('mileage from a string', mileage('45000'), '45,000 km');
eq('mileage null is a dash', mileage(null), '—');
eq('mileage NaN is a dash', mileage(NaN), '—');
eq('mileageOrNull returns null for null', mileageOrNull(null), null);
eq('mileageOrNull formats a value', mileageOrNull(45000), '45,000 km');

// ── groupNumber, used for the mileage-band chips ────────────────────────
eq('groupNumber groups', groupNumber(100000), '100,000');
eq('groupNumber has no currency symbol', groupNumber(1000).indexOf('₦'), -1);

// ── toAmount, the shared parser ─────────────────────────────────────────
eq('toAmount parses a string', toAmount('24780.00'), 24780);
eq('toAmount rejects nonsense', toAmount('abc'), null);
eq('toAmount keeps zero', toAmount(0), 0);
check('toAmount rejects null', toAmount(null) === null);

// ── The guard against a regression back to Intl ─────────────────────────
{
  /*
    Comments are stripped first. Both files EXPLAIN why Intl is avoided, and a
    naive grep matched that prose and reported a violation that did not exist —
    a guard that cries wolf gets deleted, which is worse than not having one.
  */
  const stripComments = (src) =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  const files = [
    ['src/utils/format.ts', 'the formatting helpers'],
    ['app/service-prices.tsx', 'the price board screen'],
    ['app/(tabs)/service.tsx', 'the Service tab'],
  ];

  for (const [rel, label] of files) {
    const code = stripComments(fs.readFileSync(path.join(root, rel), 'utf8'));
    check(
      `${label} calls no Intl`,
      !/\bIntl\s*\./.test(code),
      'Intl.NumberFormat renders blank under Hermes in release builds',
    );
    check(
      `${label} calls no toLocaleString on a number`,
      !/toLocaleString\s*\(\s*['"]en/.test(code),
      'a locale argument drops separators under Hermes',
    );
  }
}

fs.rmSync(out, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
