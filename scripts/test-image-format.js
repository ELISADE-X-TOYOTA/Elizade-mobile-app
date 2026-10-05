#!/usr/bin/env node
/**
 * The allowlist that decides whether a picked image needs converting.
 *
 * THE iOS UPLOAD FAILURE. iPhones shoot HEIC. `expo-image-picker` converts
 * most formats to JPEG on the way out and passes HEIC through untouched —
 * its iOS source special-cases `UTType.heic` and returns the raw bytes. The
 * upload endpoints accept jpeg, png, webp, pdf, mp4 and quicktime, so every
 * iPhone camera-roll photo came back 415 while Android, which shoots JPEG,
 * worked. It looked like "uploads are broken on iOS" and was one missing
 * format.
 *
 * The real conversion needs a native module, so what is tested here is the
 * decision: which types pass through and which get re-encoded. Getting that
 * backwards either converts everything (slow, lossy) or converts nothing
 * (the bug).
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'data', 'imageFormat.ts'),
  'utf8',
);

let pass = 0;
let fail = 0;
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
};

// The allowlist as written in the module under test.
const match = src.match(/ACCEPTED_IMAGE_TYPES = new Set\(\[([^\]]+)\]\)/);
const accepted = match
  ? match[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
  : [];

console.log('\nthe formats the API already stores pass through untouched');
{
  for (const t of ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']) {
    check(`${t} is accepted as-is`, accepted.includes(t));
  }
}

console.log('\nthe formats that caused the 415 are converted');
{
  for (const t of ['image/heic', 'image/heif', 'image/tiff', 'image/avif']) {
    check(`${t} is NOT on the allowlist, so it converts`, !accepted.includes(t), t);
  }
}

console.log('\nthe rule is an allowlist, not a HEIC special case');
{
  check(
    'an unknown future format converts rather than being sent blindly',
    !accepted.includes('image/jxl'),
    'a blocklist would have let this through to another 415',
  );
  check('exactly four accepted types', accepted.length === 4, String(accepted.length));
}

console.log('\nthe extension moves with the bytes');
{
  check(
    'the filename is rewritten to .jpg on conversion',
    /\.replace\(\/\\\.\[\^\.\]\+\$\/, ''\) \+ '\.jpg'/.test(src) || src.includes("+ '.jpg'"),
    'the server derives what it stores — and how it serves it back — from the name',
  );
  check('the converted mime type is image/jpeg', src.includes("mimeType: 'image/jpeg'"));
}

console.log('\nfailure to convert must not lose the attachment');
{
  check(
    'a conversion error returns the original rather than throwing',
    /catch\s*\{\s*return input;/.test(src),
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
