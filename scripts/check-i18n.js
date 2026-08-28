#!/usr/bin/env node
/**
 * Locale parity guard.
 *
 * English is the source of truth. Every other locale must define exactly the
 * same keys — no more, no fewer.
 *
 * A MISSING key is invisible in development: i18next falls back to English,
 * so the screen still reads fine to an English-speaking developer and ships
 * half-translated. An EXTRA key is a typo'd or renamed key that no longer
 * matches anything and will never render.
 *
 * Interpolation placeholders are checked too. `{{date}}` renamed to `{{data}}`
 * in one locale produces a literal "{{date}}" on screen for those users only.
 */

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const SOURCE = 'en';

/** Flattens nested objects to dotted paths: {a:{b:1}} → {"a.b": 1}. */
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

const placeholders = (s) =>
  new Set((String(s).match(/\{\{\s*\w+\s*\}\}/g) || []).map((p) => p.replace(/\s/g, '')));

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'));
const source = flatten(JSON.parse(fs.readFileSync(path.join(DIR, `${SOURCE}.json`), 'utf8')));
const sourceKeys = Object.keys(source);

let failed = false;
const report = [];

for (const file of files) {
  const code = path.basename(file, '.json');
  if (code === SOURCE) continue;

  const target = flatten(JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8')));
  const missing = sourceKeys.filter((k) => !(k in target));
  const extra = Object.keys(target).filter((k) => !(k in source));

  const badPlaceholders = sourceKeys
    .filter((k) => k in target)
    .filter((k) => {
      const a = placeholders(source[k]);
      const b = placeholders(target[k]);
      return a.size !== b.size || [...a].some((p) => !b.has(p));
    });

  // An untranslated string is not an error — some words are identical across
  // languages ("Elizade", "Email" in French) — but a locale that is mostly
  // English is a sign the file was copied and never translated.
  const identical = sourceKeys.filter((k) => k in target && source[k] === target[k]);
  const pctIdentical = Math.round((identical.length / sourceKeys.length) * 100);

  if (missing.length || extra.length || badPlaceholders.length) failed = true;

  report.push({ code, missing, extra, badPlaceholders, pctIdentical });
}

console.log(`i18n parity — ${SOURCE}.json defines ${sourceKeys.length} keys\n`);

for (const r of report) {
  const ok = !r.missing.length && !r.extra.length && !r.badPlaceholders.length;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${r.code}  (${100 - r.pctIdentical}% translated)`);
  for (const k of r.missing.slice(0, 10)) console.log(`          missing: ${k}`);
  if (r.missing.length > 10) console.log(`          …and ${r.missing.length - 10} more missing`);
  for (const k of r.extra.slice(0, 10)) console.log(`          unknown key: ${k}`);
  for (const k of r.badPlaceholders) console.log(`          placeholder mismatch: ${k}`);
}

// ── The language table ───────────────────────────────────────────────────
//
// Checked against the filesystem because the two drift independently: adding
// a locale file without registering it means it never loads, and registering
// a language without its file means selecting it renders nothing but
// fallbacks.

const langSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'i18n', 'languages.ts'), 'utf8');
const declared = [...langSrc.matchAll(/code:\s*'([a-z-]+)'/g)].map((m) => m[1]);
const onDisk = files.map((f) => path.basename(f, '.json')).sort();

const undeclared = onDisk.filter((c) => !declared.includes(c));
const unshipped = declared.filter((c) => !onDisk.includes(c));

console.log('\nlanguage table');
console.log(`  declared: ${declared.join(', ')}`);
for (const c of undeclared) {
  console.log(`  FAIL  ${c}.json exists but is not registered in languages.ts`);
  failed = true;
}
for (const c of unshipped) {
  console.log(`  FAIL  ${c} is registered but has no ${c}.json`);
  failed = true;
}

// RTL is a layout decision, not a preference: getting it wrong mirrors the
// entire app for the wrong users, or leaves Arabic reading left-to-right.
const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur']);
for (const code of declared) {
  const block = langSrc.slice(langSrc.indexOf(`code: '${code}'`));
  const rtl = /rtl:\s*true/.test(block.slice(0, block.indexOf('}')));
  if (rtl !== RTL_LANGUAGES.has(code)) {
    console.log(`  FAIL  ${code} has rtl: ${rtl}, expected ${RTL_LANGUAGES.has(code)}`);
    failed = true;
  }
}
if (!undeclared.length && !unshipped.length) {
  console.log('  PASS  every declared language ships a locale file');
}

if (failed) {
  console.error('\ni18n check FAILED — locales are out of sync with en.json.');
  process.exit(1);
}
console.log('\ni18n check passed — all locales define the same keys.');
