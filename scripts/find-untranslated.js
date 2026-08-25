#!/usr/bin/env node
/**
 * Finds user-facing English still hardcoded in screens and components.
 *
 * Catches the two shapes that actually reach a user's eyes:
 *   1. JSX text nodes    — <Txt>Book Service</Txt>
 *   2. UI string props   — label="Save", placeholder="Search…", title="Home"
 *
 * Heuristic by necessity: there is no way to be certain a given string
 * literal is user-facing without types the codebase does not carry. It errs
 * toward reporting, and the ignore list below carries the things that look
 * like copy but are not — style values, route names, icon names.
 *
 * Run with --list to print every finding; bare, it prints per-file counts.
 */

const fs = require('fs');
const path = require('path');

const ROOTS = ['app', 'src'];
const LIST = process.argv.includes('--list');

/** Not copy, despite looking like it. */
const IGNORE = [
  /^[a-z-]+$/, // icon names, style keywords: 'chevron-forward', 'center'
  /^#[0-9a-fA-F]{3,8}$/, // colours
  /^\d+(\.\d+)?(px|%)?$/, // numbers and dimensions
  /^\/[\w/[\]().-]*$/, // route paths: '/(tabs)/home'
  /^[\w.-]+@[\w.-]+$/, // emails
  /^https?:\/\//,
  /^[A-Z_]{2,}$/, // CONSTANTS
  /^\s*$/,
  // A masked card display ("Visa •••• 4242") is a brand name and four
  // digits — the same in every language, and nothing to translate.
  /^(Visa|Mastercard|Verve|Amex)\s+[•*•]{2,}\s*\d{4}$/,
];

const ignored = (s) => IGNORE.some((re) => re.test(s.trim()));

/**
 * A JSX *expression* caught by the text regex, not copy.
 *
 * `{cond ? (` and friends sit between a `>` and a `<` just like real text
 * does. Without this the report cries wolf on three files forever, and a
 * guard nobody trusts is a guard nobody runs.
 */
const isCode = (s) =>
  /[(){}[\]]|=>|===|!==|\.\w+\(|&&|\|\|/.test(s);

/** Props whose value is rendered to the user. */
const UI_PROPS =
  /\b(label|title|placeholder|accessibilityLabel|accessibilityHint|heading|subtitle|message|emptyText|caption)\s*=\s*["']([^"']{2,80})["']/g;

/** A JSX text node: >Some Words< — must start with a letter. */
const JSX_TEXT = />\s*([A-Za-z][^<>{}\n]{2,80}?)\s*</g;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== 'i18n') walk(fp, out);
    } else if (e.name.endsWith('.tsx')) out.push(fp);
  }
  return out;
}

const files = ROOTS.flatMap((r) => (fs.existsSync(r) ? walk(r) : []));
const results = [];
let total = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const hits = [];

  const record = (text, index) => {
    if (ignored(text) || isCode(text)) return;
    // Skip anything already inside a t(...) call on the same line.
    const line = lines[src.slice(0, index).split('\n').length - 1] ?? '';
    if (/\bt\(|\btr\(|i18n\.t\(/.test(line)) return;
    hits.push({ line: src.slice(0, index).split('\n').length, text: text.trim() });
  };

  for (const m of src.matchAll(UI_PROPS)) record(m[2], m.index);
  for (const m of src.matchAll(JSX_TEXT)) {
    // JSX_TEXT also matches inside comments and generics; require the line to
    // look like markup rather than a type annotation.
    if (/^\s*(\/\/|\*|\/\*)/.test(lines[src.slice(0, m.index).split('\n').length - 1] ?? '')) continue;
    record(m[1], m.index);
  }

  if (hits.length) {
    results.push({ file, hits });
    total += hits.length;
  }
}

results.sort((a, b) => b.hits.length - a.hits.length);

console.log(`Untranslated user-facing strings: ${total} across ${results.length} files\n`);
for (const r of results) {
  console.log(`  ${String(r.hits.length).padStart(3)}  ${r.file}`);
  if (LIST) for (const h of r.hits) console.log(`         ${h.line}: ${h.text}`);
}

if (!LIST && total) console.log('\nRun with --list to see each string.');

// A hard gate. New hardcoded copy fails the build rather than shipping
// English into six other languages — which is exactly how a half-translated
// app happens: it looks correct to whoever wrote it.
if (total) {
  console.error(`\nFAILED — ${total} user-facing string(s) are not translated.`);
  process.exit(1);
}
console.log('No untranslated user-facing strings.');
