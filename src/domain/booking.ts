/**
 * Test-drive slot arithmetic.
 *
 * Pure and `now`-injectable so the rules can be tested at arbitrary times of
 * day — "does the 4pm slot disappear at 4:01pm" is not a question you want to
 * answer by waiting until 4:01pm.
 *
 * Both rules here exist because the API enforces them and a booking is a real
 * appointment at a real showroom: a wrong time is worse than a rejected one.
 */

/** Bookable slots as [hour, minute]. Labels are DERIVED — never hand-written. */
export const SLOTS: [number, number][] = [
  [9, 0],
  [10, 30],
  [12, 0],
  [14, 0],
  [16, 0],
];

/** Display label for a slot, formatted from the same tuple that is submitted. */
export function slotLabel([h, m]: [number, number]): string {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
}

/** The exact datetime a given day + slot resolves to. */
export function slotTime(day: Date, slotIndex: number): Date {
  const d = new Date(day);
  const [h, m] = SLOTS[slotIndex] ?? SLOTS[0];
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * `POST /sales/test-drives` rejects anything not strictly in the future, so a
 * lapsed slot is disabled up front rather than left tappable to fail on submit.
 */
export function isSlotPast(day: Date, slotIndex: number, now: Date = new Date()): boolean {
  return slotTime(day, slotIndex).getTime() <= now.getTime();
}

/** True once every slot on `day` has lapsed — only ever today. */
export function isDayFull(day: Date, now: Date = new Date()): boolean {
  return SLOTS.every((_, i) => isSlotPast(day, i, now));
}

/** First slot still bookable on `day`, or -1 if the day is done. */
export function firstOpenSlot(day: Date, now: Date = new Date()): number {
  return SLOTS.findIndex((_, i) => !isSlotPast(day, i, now));
}
