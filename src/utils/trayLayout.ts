/**
 * Where the compare tray docks.
 *
 * Pure, and separated from the component, because this is arithmetic that goes
 * wrong silently: the tray is mounted once at the app root and has to clear
 * whatever the CURRENT screen puts at the bottom of itself, which is a
 * different thing on every route. Getting it wrong does not throw and does not
 * fail a typecheck — it just parks a floating dock on top of another screen's
 * buttons, and the buttons are then reported as "not responsive".
 *
 * The subtle one is double-counting. A measured sticky bar ALREADY includes
 * the safe-area inset in its own bottom padding, so adding the inset again on
 * top of it lifts the tray by an extra ~34pt on any handset with a gesture
 * bar, and by nothing at all on one without — a gap that looks like a design
 * choice on the device you happen to be testing.
 */

/** Height of the floating tab bar, so the tray docks above rather than over it. */
export const TAB_BAR_H = 66;

/** Breathing room between the tray and whatever sits below it. */
export const TRAY_GAP = 16;

/** Used when a device reports no bottom inset at all. */
export const MIN_SAFE_BOTTOM = 12;

export interface TrayLayout {
  /** True on a tab screen, where the floating tab bar has to be cleared. */
  onTabScreen: boolean;
  /** `insets.bottom` as reported by the safe-area provider. */
  safeAreaBottom: number;
  /**
   * Measured height of the sticky action bar the current screen owns, or 0
   * when it has none. Already includes that screen's own inset padding.
   */
  stickyBarHeight: number;
}

export function trayBottomOffset({
  onTabScreen,
  safeAreaBottom,
  stickyBarHeight,
}: TrayLayout): number {
  const safeBottom = safeAreaBottom > 0 ? safeAreaBottom : MIN_SAFE_BOTTOM;

  // The tab bar is the thing to clear, and it is positioned off the inset —
  // so here the inset does count.
  if (onTabScreen) return safeBottom + TAB_BAR_H + 10;

  // A measured bar spans from the very bottom of the screen up to its own
  // height, inset padding included. Clear the bar itself and nothing more.
  if (stickyBarHeight > 0) return stickyBarHeight + TRAY_GAP;

  return safeBottom + TRAY_GAP;
}
