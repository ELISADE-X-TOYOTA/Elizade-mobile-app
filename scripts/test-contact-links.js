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

const { whatsappUrl, telUrl, mailtoUrl } = require(path.join(out, 'contactLinks.js'));

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

// The OFFICIAL details. The old ones were a 0700 service line with no
// WhatsApp account behind it, which answered "isn't on WhatsApp".
const LIVE = '09013248553';
const LIVE_WA = '2349013248553';
const LIVE_EMAIL = 'info@elizade.net';

console.log('\nwhatsapp: digits only, or the chat never opens');
check(
  'the official WhatsApp account resolves',
  whatsappUrl(LIVE_WA) === 'https://wa.me/2349013248553',
  whatsappUrl(LIVE_WA),
);
check(
  'the WhatsApp string is NOT the dial string',
  LIVE_WA !== LIVE,
  'these must differ: wa.me needs international digits, tel: dials nationally',
);
check('no plus survives', !whatsappUrl('+' + LIVE_WA).includes('+'), whatsappUrl('+' + LIVE_WA));
for (const [label, input] of [
  ['spaces', '+234 901 324 8553'],
  ['dashes', '+234-901-324-8553'],
  ['parentheses', '+234 (901) 324 8553'],
  ['leading/trailing space', '  2349013248553 '],
]) {
  check(
    `${label} are stripped`,
    whatsappUrl(input) === 'https://wa.me/2349013248553',
    whatsappUrl(input),
  );
}
check(
  'a national-format number is passed through as its digits',
  whatsappUrl('09013248553') === 'https://wa.me/09013248553',
  whatsappUrl('09013248553'),
);

console.log('\ntel: E.164, separators gone, plus kept');
check('the official line dials exactly as specified', telUrl(LIVE) === 'tel:09013248553', telUrl(LIVE));
check(
  'separators are stripped but the plus stays',
  telUrl('+234 901-324-8553') === 'tel:+2349013248553',
  telUrl('+234 901-324-8553'),
);
check(
  'a number without a plus does not gain one',
  telUrl('09013248553') === 'tel:09013248553',
  telUrl('09013248553'),
);
check(
  'surrounding whitespace does not hide the plus',
  telUrl('  +2349013248553') === 'tel:+2349013248553',
  telUrl('  +2349013248553'),
);

console.log('\nmailto');
check('plain address', mailtoUrl(LIVE_EMAIL) === 'mailto:info@elizade.net', mailtoUrl(LIVE_EMAIL));
check('subject is encoded', mailtoUrl(LIVE_EMAIL, 'Order #12 & refund').includes('%26'),
  mailtoUrl(LIVE_EMAIL, 'Order #12 & refund'));
check('an unencoded hash cannot truncate the link',
  !mailtoUrl(LIVE_EMAIL, 'Fault #7').includes('#'),
  mailtoUrl(LIVE_EMAIL, 'Fault #7'));
check('no subject means no query string', !mailtoUrl(LIVE_EMAIL).includes('?'));

console.log('\nboth are plain, openable URLs');
for (const [label, url] of [
  ['whatsapp', whatsappUrl(LIVE_WA)],
  ['tel', telUrl(LIVE)],
  ['mailto', mailtoUrl(LIVE_EMAIL)],
]) {
  check(`${label} has no whitespace`, !/\s/.test(url), url);
  check(`${label} needs no escaping`, url === encodeURI(url), url);
}

fs.rmSync(out, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
