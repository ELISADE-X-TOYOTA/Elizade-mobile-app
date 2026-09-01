#!/usr/bin/env node
/**
 * Every EXPO_PUBLIC_* flag the app reads must be declared in every EAS build
 * profile.
 *
 * WHY THIS EXISTS. `.env` is gitignored and is NOT uploaded to a cloud build.
 * A flag that lives only there is simply absent from the bundle, and an absent
 * flag takes whatever the default is — which is invisible in Expo Go and only
 * shows up on an installed APK.
 *
 * That has now cost two rounds: `EXPO_PUBLIC_SERVICE_PRICES` was opt-in, so its
 * absence read as OFF and the Prices button disappeared from every release
 * build while working perfectly on the dev server.
 *
 * The rule enforced here is narrow and mechanical: if `constants/app.ts` reads
 * it, `eas.json` declares it. Whether the default is safe is a judgement call
 * this cannot make — but a flag nobody remembered to ship is not a judgement
 * call, it is an oversight, and that is catchable.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appTs = fs.readFileSync(path.join(root, 'src', 'constants', 'app.ts'), 'utf8');
const eas = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));

const used = [...new Set(
  [...appTs.matchAll(/process\.env\.(EXPO_PUBLIC_[A-Z0-9_]+)/g)].map((m) => m[1]),
)].sort();

console.log(`flags read by constants/app.ts (${used.length}):`);
for (const flag of used) console.log(`  ${flag}`);
console.log();

let missing = 0;
for (const [name, profile] of Object.entries(eas.build ?? {})) {
  // An `extends` profile inherits env, but these all declare their own, so
  // check what this profile actually ships rather than guessing at merge order.
  const env = profile.env ?? {};
  const gaps = used.filter((flag) => !(flag in env));
  if (gaps.length === 0) {
    console.log(`  PASS  ${name}`);
  } else {
    missing += gaps.length;
    console.log(`  FAIL  ${name} — missing: ${gaps.join(', ')}`);
  }
}

console.log();
if (missing > 0) {
  console.log(
    `${missing} missing declaration(s). Add them to eas.json — a .env file does\n` +
    'NOT reach a cloud build, so the flag would be absent in the shipped bundle.',
  );
  process.exit(1);
}
console.log('Build env check passed — every flag the app reads is declared in every profile.');
