#!/usr/bin/env node
/**
 * Tests the real `src/utils/mediaAuth.ts`.
 *
 * `SecureAttachment` attached `Authorization: Bearer <jwt>` to EVERY image it
 * rendered. Correct for `/media/documents/...`, which our own API protects.
 * Wrong for everything else — and production stores attachments in
 * DigitalOcean Spaces, so the header went there instead. Spaces is
 * S3-compatible: it parses `Authorization` as an AWS signature, does not
 * recognise "Bearer", and answers 400 InvalidArgument.
 *
 * Confirmed against a real production attachment: a plain GET returns 200 and
 * a 97KB JPEG; the identical request carrying the app's header returns 400.
 * So every chat attachment uploaded fine, stored fine, and then refused to
 * render — in production only, because development has no Spaces and serves
 * the same files from `/media/`, where the token IS required. That asymmetry
 * is why this needs a test rather than a look.
 *
 * The rule also has to fail CLOSED. A missing token on a public object is a
 * rendered image; a token sent to a stranger cannot be taken back.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'elz-media-'));
const tscBin = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');

try {
  execFileSync(
    process.execPath,
    ['tsc', 'src/utils/mediaAuth.ts', '--outDir', out, '--module', 'commonjs', '--target', 'es2020']
      .map((a, i) => (i === 0 ? tscBin : a)),
    { stdio: 'pipe', cwd: path.join(__dirname, '..') },
  );
} catch (e) {
  console.error('Could not compile mediaAuth.ts');
  console.error(e.stdout?.toString() || e.message);
  process.exit(1);
}

const { mediaNeedsAuth, originOf } = require(path.join(out, 'mediaAuth.js'));

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

const API = 'https://elizade-backend-api-production.up.railway.app/api/v1';
const SPACES =
  'https://elizade-connect-media-devv.lon1.digitaloceanspaces.com/customer/support/e96bbc2b0a174a6b80a47669a2066993.jpg';

console.log('\nthe bug: object storage must never receive the token');
check('a real Spaces attachment gets no header', mediaNeedsAuth(SPACES, API) === false, SPACES);
check(
  'nor any other Spaces folder',
  ['warranty', 'trade-ins', 'ownership', 'avatars'].every(
    (f) =>
      mediaNeedsAuth(
        `https://elizade-connect-media-devv.lon1.digitaloceanspaces.com/customer/${f}/abc.jpg`,
        API,
      ) === false,
  ),
);

console.log('\nour own protected media route still gets it');
check("a relative '/media/documents' path", mediaNeedsAuth('/media/documents/abc.jpg', API) === true);
check(
  'the same file as an absolute URL on our API host',
  mediaNeedsAuth(
    'https://elizade-backend-api-production.up.railway.app/media/documents/abc.jpg',
    API,
  ) === true,
);
check(
  'local development over http',
  mediaNeedsAuth('http://192.168.1.20:8000/media/documents/abc.jpg', 'http://192.168.1.20:8000/api/v1') === true,
);

console.log('\nfails closed on anything unrecognised');
for (const [label, url] of [
  ['an unrelated https host', 'https://attacker.example/pixel.png'],
  ['a lookalike host', 'https://elizade-backend-api-production.up.railway.app.evil.test/media/x.jpg'],
  ['a bare path that is not /media', '/images/car.jpg'],
  ['a protocol-relative URL', '//elizade-backend-api-production.up.railway.app/media/x.jpg'],
  ['a local file URI', 'file:///var/mobile/tmp/photo.jpg'],
  ['a data URI', 'data:image/png;base64,iVBORw0KGgo='],
  ['empty', ''],
  ['null', null],
  ['undefined', undefined],
]) {
  check(`${label} gets no header`, mediaNeedsAuth(url, API) === false, String(url));
}

console.log('\nhost matching is exact, not a prefix');
{
  // "…railway.app" must not match "…railway.app.evil.test", and a different
  // port is a different origin.
  check(
    'a suffixed host is refused',
    mediaNeedsAuth('https://up.railway.app.evil.test/media/x.jpg', API) === false,
  );
  check(
    'a different port is refused',
    mediaNeedsAuth('http://localhost:9999/media/x.jpg', 'http://localhost:8000/api/v1') === false,
  );
  check(
    'the same port is allowed',
    mediaNeedsAuth('http://localhost:8000/media/x.jpg', 'http://localhost:8000/api/v1') === true,
  );
  check(
    'scheme is part of the origin',
    mediaNeedsAuth('http://api.elizade.test/media/x.jpg', 'https://api.elizade.test/api/v1') === false,
  );
}

console.log('\ncase and whitespace do not create a bypass');
check(
  'an upper-case host still matches',
  mediaNeedsAuth('https://ELIZADE-BACKEND-API-PRODUCTION.UP.RAILWAY.APP/media/x.jpg', API) === true,
);
check('surrounding whitespace is trimmed', mediaNeedsAuth('  /media/documents/a.jpg ', API) === true);

console.log('\noriginOf');
check('extracts scheme and host', originOf('https://a.example/b/c') === 'https://a.example');
check('keeps the port', originOf('http://a.example:8000/x') === 'http://a.example:8000');
check('stops at a query', originOf('https://a.example?x=1') === 'https://a.example');
check('empty for a relative path', originOf('/media/x.jpg') === '');

fs.rmSync(out, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
