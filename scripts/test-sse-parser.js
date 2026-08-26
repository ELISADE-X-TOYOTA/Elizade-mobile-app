#!/usr/bin/env node
/**
 * Tests the real `src/data/sseParser.ts`.
 *
 * The parser is where a live-notification feature quietly fails: frames
 * arrive split across TCP reads, so a parser that assumes one chunk equals
 * one frame passes every hand-run test and silently drops events on a real
 * network. These cases feed it the awkward shapes on purpose.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'elz-sse-'));
const tscBin = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');

try {
  execFileSync(
    process.execPath,
    [tscBin, 'src/data/sseParser.ts', '--outDir', out, '--module', 'commonjs', '--target', 'es2020'],
    { stdio: 'pipe', cwd: path.join(__dirname, '..') },
  );
} catch (e) {
  console.error('Could not compile sseParser.ts');
  console.error(e.stdout?.toString() || e.message);
  process.exit(1);
}

const { parseSseChunk } = require(path.join(out, 'sseParser.js'));

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

// A single well-formed frame.
{
  const { events, rest } = parseSseChunk('event: unread\ndata: {"unread": 3}\n\n');
  check('parses one frame', events.length === 1 && events[0].event === 'unread');
  check('extracts the data', events[0]?.data === '{"unread": 3}');
  check('leaves no remainder', rest === '');
}

// THE case that matters: a frame split across two reads.
{
  const first = parseSseChunk('event: unread\ndata: {"unr');
  check('a partial frame emits nothing', first.events.length === 0);
  check('a partial frame is held as rest', first.rest.length > 0);

  const second = parseSseChunk(first.rest + 'ead": 7}\n\n');
  check('the frame completes on the next chunk', second.events.length === 1);
  check('and reassembles correctly', second.events[0]?.data === '{"unread": 7}');
}

// Several frames in one read.
{
  const { events } = parseSseChunk(
    'event: unread\ndata: {"unread": 1}\n\nevent: unread\ndata: {"unread": 2}\n\n',
  );
  check('parses two frames from one chunk', events.length === 2);
  check('preserves their order', events[0]?.data.includes('1') && events[1]?.data.includes('2'));
}

// Keep-alive comments carry nothing.
{
  const { events } = parseSseChunk(': keep-alive\n\n');
  check('ignores keep-alive comments', events.length === 0);
}
{
  const { events } = parseSseChunk(': keep-alive\n\nevent: unread\ndata: {"unread": 5}\n\n');
  check('a keep-alive does not swallow the next frame', events.length === 1);
}

// Proxies rewrite line endings.
{
  const { events } = parseSseChunk('event: unread\r\ndata: {"unread": 9}\r\n\r\n');
  check('handles CRLF line endings', events.length === 1 && events[0].data === '{"unread": 9}');
}

// A frame with no explicit event name defaults to "message".
{
  const { events } = parseSseChunk('data: hello\n\n');
  check('defaults the event name to message', events[0]?.event === 'message');
}

// Multi-line data is joined, per the spec.
{
  const { events } = parseSseChunk('data: one\ndata: two\n\n');
  check('joins multiple data lines', events[0]?.data === 'one\ntwo');
}

// An empty buffer must not throw or invent events.
{
  const { events, rest } = parseSseChunk('');
  check('empty buffer is safe', events.length === 0 && rest === '');
}

// A byte-at-a-time stream — the pathological case.
{
  const stream = 'event: unread\ndata: {"unread": 42}\n\n';
  let buffer = '';
  let seen = [];
  for (const ch of stream) {
    const { events, rest } = parseSseChunk(buffer + ch);
    buffer = rest;
    seen = seen.concat(events);
  }
  check('survives a byte-at-a-time stream', seen.length === 1, `got ${seen.length}`);
  check('with the payload intact', seen[0]?.data === '{"unread": 42}');
}

fs.rmSync(out, { recursive: true, force: true });

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
