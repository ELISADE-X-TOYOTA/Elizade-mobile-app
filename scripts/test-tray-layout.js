#!/usr/bin/env node
/**
 * Tests the real `src/utils/trayLayout.ts`.
 *
 * The compare tray is mounted once at the app root, so it has to clear
 * whatever the CURRENT screen puts at the bottom of itself — and that is a
 * different thing on every route. It knew about the floating tab bar and
 * nothing else, so on a car's details page it docked at roughly 50pt and
 * landed on top of that screen's sticky action bar: staging a car for
 * comparison put Reserve and Test Drive underneath the dock.
 *
 * This arithmetic is worth pinning because it fails INVISIBLY. It does not
 * throw, it does not fail a typecheck, and the most likely error — adding the
 * safe-area inset on top of a measured bar that already contains it — is
 * exactly 0pt wrong on a device with no gesture bar and ~34pt wrong on one
 * with. Test it on the wrong handset and it looks like a design choice.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'elz-tray-'));
const tscBin = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');

try {
  execFileSync(
    process.execPath,
    ['tsc', 'src/utils/trayLayout.ts', '--outDir', out, '--module', 'commonjs', '--target', 'es2020']
      .map((a, i) => (i === 0 ? tscBin : a)),
    { stdio: 'pipe', cwd: path.join(__dirname, '..') },
  );
} catch (e) {
  console.error('Could not compile trayLayout.ts');
  console.error(e.stdout?.toString() || e.message);
  process.exit(1);
}

const { trayBottomOffset, TAB_BAR_H, TRAY_GAP, MIN_SAFE_BOTTOM } = require(
  path.join(out, 'trayLayout.js'),
);

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

/** A modern handset with a gesture bar, and an older one without. */
const GESTURE = 34;
const NONE = 0;
/** A car-details sticky bar as actually measured: content + its own inset. */
const CAR_BAR = 168;

console.log('\nthe tray must clear a sticky action bar, not sit on it');
{
  const bottom = trayBottomOffset({
    onTabScreen: false,
    safeAreaBottom: GESTURE,
    stickyBarHeight: CAR_BAR,
  });
  check(
    'it docks above the bar',
    bottom >= CAR_BAR,
    `bottom=${bottom} but the bar is ${CAR_BAR} tall — the tray is on top of it`,
  );
  check('with a visible gap', bottom === CAR_BAR + TRAY_GAP, `bottom=${bottom}`);
}

console.log('\nthe inset is not counted twice');
{
  // A measured bar already contains the screen's own bottom padding. Adding
  // the inset again lifts the tray by an extra 34pt on one device and 0 on
  // another, which is the error this test exists to catch.
  const withGesture = trayBottomOffset({
    onTabScreen: false,
    safeAreaBottom: GESTURE,
    stickyBarHeight: CAR_BAR,
  });
  const withoutGesture = trayBottomOffset({
    onTabScreen: false,
    safeAreaBottom: NONE,
    stickyBarHeight: CAR_BAR,
  });
  check(
    'the same measured bar gives the same offset on both handsets',
    withGesture === withoutGesture,
    `gesture=${withGesture} none=${withoutGesture} — the inset is being added twice`,
  );
}

console.log('\nno sticky bar: fall back to the safe area');
{
  check(
    'a gesture bar is cleared',
    trayBottomOffset({ onTabScreen: false, safeAreaBottom: GESTURE, stickyBarHeight: 0 }) ===
      GESTURE + TRAY_GAP,
  );
  check(
    'a device reporting no inset still gets a margin',
    trayBottomOffset({ onTabScreen: false, safeAreaBottom: NONE, stickyBarHeight: 0 }) ===
      MIN_SAFE_BOTTOM + TRAY_GAP,
  );
}

console.log('\nthe grid clears the floating tab bar');
{
  const bottom = trayBottomOffset({
    onTabScreen: true,
    safeAreaBottom: GESTURE,
    stickyBarHeight: 0,
  });
  check('above the tab bar', bottom > TAB_BAR_H, `bottom=${bottom}`);
  check('and above the inset too', bottom === GESTURE + TAB_BAR_H + 10, `bottom=${bottom}`);
}
{
  // A stale height left behind by a screen that has since unmounted must not
  // shove the tray up the grid. The tab-bar branch ignores it outright.
  const clean = trayBottomOffset({ onTabScreen: true, safeAreaBottom: GESTURE, stickyBarHeight: 0 });
  const stale = trayBottomOffset({
    onTabScreen: true,
    safeAreaBottom: GESTURE,
    stickyBarHeight: CAR_BAR,
  });
  check('a stale sticky height cannot move the tray in the grid', clean === stale,
    `clean=${clean} stale=${stale}`);
}

console.log('\nalways a usable number');
for (const args of [
  { onTabScreen: false, safeAreaBottom: 0, stickyBarHeight: 0 },
  { onTabScreen: false, safeAreaBottom: 48, stickyBarHeight: 0 },
  { onTabScreen: false, safeAreaBottom: 34, stickyBarHeight: 210 },
  { onTabScreen: true, safeAreaBottom: 0, stickyBarHeight: 0 },
]) {
  const bottom = trayBottomOffset(args);
  check(
    `positive and finite for ${JSON.stringify(args)}`,
    Number.isFinite(bottom) && bottom > 0,
    String(bottom),
  );
}

fs.rmSync(out, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
