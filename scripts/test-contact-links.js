#!/usr/bin/env node
/**
 * Tests the real `src/utils/contactLinks.ts`.
 *
 * CONTEXT: the Support tab's Call and WhatsApp cards were plain `View`s. They
 * carried a button's surface, border, shadow and icon chip, sat at the top of
 * the screen a customer with a problem reaches for first, and had no handler
 * at all. Wiring them is the fix; keeping them wired is what this guards.
 *
 * The formatting rules are the failure-prone part, because both mistakes fail
 * SILENTLY on a device and nowhere else:
 *
 *   * `wa.me` resolves digits only. A `+` produces "phone number shared via
 *     url is invalid", which a customer reads as the business being
 *     unreachable — a dead button replaced by a confusing one.
 *   * `tel:` is unreliable across diallers when separators survive.
 *
 * Neither raises. Neither shows up in a typecheck. Both are one edit away from
 * coming back the next time someone pastes a prettier phone number into the
 * constants file.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'elz-contact-'));
const tscBin = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');

try {
  execFileSync(
    process.execPath,
    [
      tscBin,
      'src/utils/contactLinks.ts',
      '--outDir',
      out,
      '--module',
      'commonjs',
      '--target',
      'es2020',
    ],
    { stdio: 'pipe', cwd: path.join(__dirname, '..') },
  );
} catch (e) {
  console.error('Could not compile contactLinks.ts');
  console.error(e.stdout?.toString() || e.message);
  process.exit(1);
}

const { whatsappUrl, telUrl } = require(path.join(out, 'contactLinks.js'));

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

const LIVE = '+2347003549233';

console.log('\nwhatsapp: digits only, or the chat never opens');
check(
  'the real support number resolves',
  whatsappUrl(LIVE) === 'https://wa.me/2347003549233',
  whatsappUrl(LIVE),
);
check('no plus survives', !whatsappUrl(LIVE).includes('+'), whatsappUrl(LIVE));
for (const [label, input] of [
  ['spaces', '+234 700 3549233'],
  ['dashes', '+234-700-3549233'],
  ['parentheses', '+234 (700) 3549233'],
  ['leading/trailing space', '  +2347003549233 '],
]) {
  check(
    `${label} are stripped`,
    whatsappUrl(input) === 'https://wa.me/2347003549233',
    whatsappUrl(input),
  );
}
check(
  'a national-format number is passed through as its digits',
  whatsappUrl('07003549233') === 'https://wa.me/07003549233',
  whatsappUrl('07003549233'),
);

console.log('\ntel: E.164, separators gone, plus kept');
check('the real support number dials', telUrl(LIVE) === 'tel:+2347003549233', telUrl(LIVE));
check(
  'separators are stripped but the plus stays',
  telUrl('+234 700-3549233') === 'tel:+2347003549233',
  telUrl('+234 700-3549233'),
);
check(
  'a number without a plus does not gain one',
  telUrl('07003549233') === 'tel:07003549233',
  telUrl('07003549233'),
);
check(
  'surrounding whitespace does not hide the plus',
  telUrl('  +2347003549233') === 'tel:+2347003549233',
  telUrl('  +2347003549233'),
);

console.log('\nboth are plain, openable URLs');
for (const [label, url] of [
  ['whatsapp', whatsappUrl(LIVE)],
  ['tel', telUrl(LIVE)],
]) {
  check(`${label} has no whitespace`, !/\s/.test(url), url);
  check(`${label} needs no escaping`, url === encodeURI(url), url);
}

fs.rmSync(out, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
