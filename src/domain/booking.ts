/**
 * Which appointment slots a customer may actually book.
 *
 * Pure and time-injected so it can be tested: every bug in this kind of code
 * is a boundary bug — the slot exactly on the cutoff, the last slot of the
 * day, the day with nothing left — and none of those are reachable by hand at
 * whatever time you happen to be testing.
 *
 * TWO PRESENTATION STYLES, ONE RULE. Test drives show every slot and disable
 * the passed ones (`isSlotPast`, `isDayFull`); service booking omits them
 * entirely (`bookableSlots`, `bookableDays`). Both read the same cutoff from
 * here, so the two screens can never disagree about what is bookable.
 *
 * The API is the authority — a device clock can be wrong or deliberately
 * altered, and the backend re-checks every payload. This exists so a customer
 * is never offered something that will be rejected after they fill the form in.
 */

export interface Slot {
  /** Display label, e.g. "10:30 AM". */
  label: string;
  hour: number;
  minute: number;
}

/**
 * Bookable slots in a day.
 *
 * `hour` and `minute` travel together because an earlier version kept only an
 * hour: the "10:30 AM" slot mapped to hour 10 and booked 10:00, so the
 * customer was told one time and the branch was told another.
 */
export const SLOTS: readonly Slot[] = [
  { label: '9:00 AM', hour: 9, minute: 0 },
  { label: '10:30 AM', hour: 10, minute: 30 },
  { label: '12:00 PM', hour: 12, minute: 0 },
  { label: '2:00 PM', hour: 14, minute: 0 },
  { label: '4:00 PM', hour: 16, minute: 0 },
];

/** Alias kept for readability at the service-booking call sites. */
export const SERVICE_SLOTS = SLOTS;

/**
 * How far ahead a same-day booking must be.
 *
 * Two hours, not one: the branch needs to see the request and the customer
 * has to travel. A slot fifteen minutes out is bookable in a strict sense and
 * useless to everyone in practice.
 */
export const LEAD_TIME_MINUTES = 120;

export function slotLabel(slot: Slot): string {
  return slot.label;
}

/** The concrete local instant a slot falls on, by slot object or index. */
export function slotDateTime(day: Date, slot: Slot): Date {
  const at = new Date(day);
  at.setHours(slot.hour, slot.minute, 0, 0);
  return at;
}

/** Index-based variant, for callers that track a slot by position. */
export function slotTime(day: Date, slotIndex: number): Date {
  const slot = SLOTS[slotIndex] ?? SLOTS[0];
  return slotDateTime(day, slot);
}

/** Same calendar day in LOCAL time — not a UTC comparison. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** The earliest instant that may be booked right now. */
function cutoff(now: Date, leadMinutes: number): Date {
  return new Date(now.getTime() + leadMinutes * 60_000);
}

/** Has this slot passed, or fallen inside the lead window? */
export function isSlotPast(
  day: Date,
  slotIndex: number,
  now: Date = new Date(),
  leadMinutes: number = LEAD_TIME_MINUTES,
): boolean {
  if (!day) return true;
  return slotTime(day, slotIndex) < cutoff(now, leadMinutes);
}

/**
 * Slots still bookable on `day`.
 *
 * A future day returns everything. Today returns only what is far enough
 * ahead, which late in the afternoon is legitimately none.
 */
export function bookableSlots(
  day: Date,
  now: Date = new Date(),
  leadMinutes: number = LEAD_TIME_MINUTES,
): Slot[] {
  if (!day) return [];
  const limit = cutoff(now, leadMinutes);
  return SLOTS.filter((slot) => slotDateTime(day, slot) >= limit);
}

/** Nothing left on this day. */
export function isDayFull(day: Date, now: Date = new Date(), leadMinutes = LEAD_TIME_MINUTES): boolean {
  return bookableSlots(day, now, leadMinutes).length === 0;
}

/** Can this day be offered at all? */
export function isDayBookable(day: Date, now: Date = new Date(), leadMinutes = LEAD_TIME_MINUTES): boolean {
  return !isDayFull(day, now, leadMinutes);
}

/**
 * Index of the first slot still bookable on `day`, or -1.
 *
 * Used when moving the selection to a day where the currently-chosen slot has
 * already lapsed — the selection is pulled forward rather than left stranded
 * on something disabled.
 */
export function firstOpenSlot(
  day: Date,
  now: Date = new Date(),
  leadMinutes: number = LEAD_TIME_MINUTES,
): number {
  return SLOTS.findIndex((_slot, index) => !isSlotPast(day, index, now, leadMinutes));
}

/**
 * The next `count` days that still have at least one slot.
 *
 * Today appears only while something is left on it. Offering a greyed-out
 * "today" that cannot be selected is worse than omitting it: the customer
 * taps, nothing happens, and nothing explains why.
 */
export function bookableDays(
  count: number,
  now: Date = new Date(),
  leadMinutes = LEAD_TIME_MINUTES,
): Date[] {
  const days: Date[] = [];
  // Scan wider than `count` so a fully-booked today does not shorten the list
  // — without this, someone booking at 5pm is offered six days, not seven.
  for (let offset = 0; days.length < count && offset < count + 7; offset += 1) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    day.setHours(0, 0, 0, 0);
    if (isDayBookable(day, now, leadMinutes)) days.push(day);
  }
  return days;
}

/**
 * Final gate before submitting. Returns an error string, or null when valid.
 *
 * Separate from the filtering above on purpose: the list goes stale while the
 * form is open. Someone who opens the screen at 11:55 is correctly offered
 * 2:00 PM; if they submit at 14:05 that slot has gone, and only this catches it.
 */
export function validateBooking(
  when: Date,
  now: Date = new Date(),
  leadMinutes: number = LEAD_TIME_MINUTES,
): string | null {
  if (!when || Number.isNaN(when.getTime())) return 'Choose a date and time for this service.';
  if (when <= now) return 'That time has already passed. Please choose a later slot.';
  if (when.getTime() - now.getTime() < leadMinutes * 60_000) {
    const hours = Math.round(leadMinutes / 60);
    return `Please choose a slot at least ${hours} hour${hours === 1 ? '' : 's'} from now.`;
  }
  return null;
}
