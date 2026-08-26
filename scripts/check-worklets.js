#!/usr/bin/env node
/**
 * Catches non-worklet functions called inside a Reanimated worklet.
 *
 * A worklet runs on the UI thread and can only capture SERIALISABLE values.
 * Capture an ordinary JS function and it arrives as a plain object, so the
 * call fails at runtime with "x is not a function (it is Object)" — and only
 * when that animation actually runs, which is why it reaches a device rather
 * than a build.
 *
 * `solid(t.colors.accent)` inside a `useAnimatedStyle` is what crashed the
 * comparison screen. The fix is always the same shape: resolve the value on
 * the JS thread, above the hook, and let the worklet capture the result.
 *
 *   const trackOn = solid(t.colors.accent);        // JS thread
 *   useAnimatedStyle(() => ({ backgroundColor: trackOn }));
 *
 * This is a heuristic — it knows a fixed list of our own helpers rather than
 * resolving every identifier. That covers the ones a colour or format call is
 * likely to reach for; it is not a substitute for reading the code.
 */

const fs = require('fs');
const path = require('path');

/** Our own plain-JS helpers. None of these are worklets. */
const SUSPECT = /\b(solid|tint|price|priceCompact|vehicleTitle|formatDate|formatMoney)\s*\(/g;

/** Hooks whose callback is compiled to a worklet. */
const WORKLET_HOOK =
  /\b(useAnimatedStyle|useDerivedValue|useAnimatedProps|useAnimatedScrollHandler|useAnimatedGestureHandler|useAnimatedReaction)\s*\(/g;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!['node_modules', '.git', '.expo'].includes(e.name)) walk(fp, out);
    } else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) out.push(fp);
  }
  return out;
}

const files = ['app', 'src'].flatMap((d) => (fs.existsSync(d) ? walk(d) : []));
const findings = [];

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  for (const hook of src.matchAll(WORKLET_HOOK)) {
    // Walk to the hook call's matching close paren so we only scan its body.
    let i = hook.index + hook[0].length - 1;
    let depth = 0;
    while (i < src.length) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') {
        depth--;
        if (depth === 0) break;
      }
      i++;
    }
    const bodyStart = hook.index + hook[0].length;
    const body = src.slice(bodyStart, i);

    for (const call of body.matchAll(SUSPECT)) {
      const line = src.slice(0, bodyStart + call.index).split('\n').length;
      findings.push({ file, line, fn: call[1], hook: hook[1] });
    }
  }
}

if (findings.length) {
  console.error('Non-worklet calls inside a Reanimated worklet:\n');
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  ${f.fn}() inside ${f.hook}`);
  }
  console.error(
    '\nThese crash at runtime with "is not a function (it is Object)".' +
      '\nResolve the value above the hook and let the worklet capture the result.\n',
  );
  process.exit(1);
}

console.log('Worklet check passed — no non-worklet calls inside worklets.');
