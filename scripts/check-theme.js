#!/usr/bin/env node
/**
 * Theme guard — fails the build on colour literals written straight into
 * screens and components.
 *
 * WHY THIS EXISTS
 * Every screen renders `backgroundColor: 'transparent'` over a single themed
 * canvas, so one stray hardcoded surface or text colour does not merely look
 * off — it produces genuinely unreadable UI in whichever theme it wasn't
 * written for, and it does so silently. `tsc` cannot catch it: '#1E1E1E' is a
 * perfectly valid string. This is the check that can.
 *
 * WHAT IT ALLOWS
 * Some colours are legitimately theme-INDEPENDENT and must not be tokenised:
 * modal scrims, ink on always-dark gradients, image placeholders, and vehicle
 * paint colours (which are data, not styling). Those live behind named
 * constants in `src/theme/colors.ts` or in the allowlist below, each with a
 * stated reason. "It looked fine on my phone" is not a reason.
 *
 *   node scripts/check-theme.js            # errors only
 *   node scripts/check-theme.js --strict   # also fail on overlay warnings
 */
const fs = require('fs');
const path = require('path');

const ROOTS = ['app', 'src'];
const EXT = new Set(['.ts', '.tsx']);

/** file (or prefix) → why a raw colour is correct there. */
const ALLOW = {
  'src/theme/': 'palette, gradient and shadow definitions — the source of truth itself',
  'src/data/mock.ts': 'vehicle paint colours (colorHex) — product data, not UI styling',
  'src/api/mappers.ts': 'fallback colorHex for vehicles missing a paint colour',
  'src/api/customer-mappers.ts': 'fallback colorHex for owned vehicles',
  'src/data/garageRepository.ts': 'fallback colorHex for owned vehicles',
  'src/components/NetworkCarImage.tsx': 'IMAGE_FALLBACK placeholder behind photography',
  'app/index.tsx': 'black splash — matches the native splash, deliberately not themed',
  'app/_layout.tsx': 'pre-mount native window colour, before React can resolve a theme',
  'app/onboarding.tsx': 'shadowColor tint on the brand accent glow',
};

// Solid hex — the dangerous class. A surface or text colour that will be wrong
// in one theme.
const HEX = /(['"])(#[0-9A-Fa-f]{3,8})\1/g;
// Alpha compositing — usually a deliberate scrim, occasionally a real bug
// (white-on-white in light mode). Reported separately, not fatal by default.
const RGBA = /(['"])(rgba?\([^'"]*\))\1/g;

const allowFor = (rel) => {
  const key = Object.keys(ALLOW).find((k) => (k.endsWith('/') ? rel.startsWith(k) : rel === k));
  return key ? ALLOW[key] : null;
};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXT.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

const errors = [];
const warnings = [];

for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const rel = file.split(path.sep).join('/');
    if (allowFor(rel)) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (line.trimStart().startsWith('*') || line.trimStart().startsWith('//')) return;
      for (const m of line.matchAll(HEX)) errors.push({ rel, ln: i + 1, val: m[2] });
      for (const m of line.matchAll(RGBA)) warnings.push({ rel, ln: i + 1, val: m[2] });
    });
  }
}

const strict = process.argv.includes('--strict');
const show = (list, label) => {
  if (!list.length) return;
  console.log(`\n${label} (${list.length})`);
  for (const v of list) console.log(`  ${v.rel}:${v.ln}  ${v.val}`);
};

show(errors, 'HARDCODED COLOUR — use a theme token');
show(warnings, 'overlay literal — confirm it is theme-independent');

if (errors.length) {
  console.log(
    '\nUse `t.colors.*` for anything on a themed surface. If the colour really is\n' +
      'theme-independent, add a named constant to src/theme/colors.ts explaining why,\n' +
      'or allowlist the file in scripts/check-theme.js with a reason.\n',
  );
  process.exit(1);
}
if (strict && warnings.length) {
  console.log('\n--strict: overlay literals treated as errors.\n');
  process.exit(1);
}
console.log(
  `\nTheme check passed — no hardcoded colours outside the allowlist` +
    `${warnings.length ? ` (${warnings.length} overlay literal(s) noted)` : ''}.\n`,
);
