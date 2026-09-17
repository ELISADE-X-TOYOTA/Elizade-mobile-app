/**
 * How a reservation reads to the customer.
 *
 * Pure, so the status vocabulary and the reference format can be tested
 * without a screen. The reference is the one a customer quotes at the branch,
 * so it has to match what the confirmation email prints — the two are derived
 * the same way from the same id, and a test pins that.
 */

export type ReservationStatus =
  | 'pending'
  | 'deposit_paid'
  | 'confirmed'
  | 'cancelled'
  | 'expired';

export const RESERVATION_STATUS_META: Record<
  ReservationStatus,
  { labelKey: string; tone: 'info' | 'success' | 'warning' | 'muted' | 'error' }
> = {
  // The hold is live but nothing has been paid — the common case, and the one
  // the app used to describe as "Deposit Paid".
  pending: { labelKey: 'reservations.statusHeld', tone: 'info' },
  deposit_paid: { labelKey: 'reservations.statusDepositPaid', tone: 'success' },
  confirmed: { labelKey: 'reservations.statusConfirmed', tone: 'success' },
  cancelled: { labelKey: 'reservations.statusCancelled', tone: 'muted' },
  expired: { labelKey: 'reservations.statusExpired', tone: 'warning' },
};

/**
 * Short handle for a reservation.
 *
 * MUST MATCH the backend's `_reservation_reference`: the customer reads this
 * off the app and quotes it to the branch, who look it up from the email. Two
 * formats for one record is a support call every time.
 */
export function reservationReference(reservationId: string): string {
  return `ELZ-${reservationId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

/** A hold that is still doing something — live, or awaiting handover. */
export function isActiveReservation(status: ReservationStatus): boolean {
  return status === 'pending' || status === 'deposit_paid' || status === 'confirmed';
}

/**
 * This customer's live hold on a vehicle, if they have one.
 *
 * Drives the car page's Reserve button, which used to read "Reserve" and open
 * the deposit sheet whether or not this customer had already reserved the
 * car. Worse, the page's own note claimed the API "still accepts" a reservation
 * on a reserved vehicle — it does not: a second live hold is refused with a
 * 409. So the button was a dead control on every reserved car, including the
 * customer's own.
 *
 * Cancelled and expired holds must NOT count, for the same reason completed
 * test drives do not: a lapsed hold would otherwise block reserving the car
 * again, which looks identical to the bug being fixed.
 */
export function activeReservationFor<T extends { vehicleId: string; status: ReservationStatus }>(
  reservations: T[],
  vehicleId: string,
): T | null {
  return reservations.find((r) => r.vehicleId === vehicleId && isActiveReservation(r.status)) ?? null;
}

/** What the car page's Reserve slot should do. */
export type ReserveAction =
  /** Open the deposit sheet. */
  | 'reserve'
  /** This customer holds it — show "Reservation Booked" and open My Reservations. */
  | 'booked'
  /** Someone else holds it, or the car is sold — nothing to press. */
  | 'blocked';

/**
 * Three states, not two. `reserved` on the vehicle means SOMEBODY holds it;
 * only this customer's own reservations say whether that somebody is them.
 */
export function reserveActionFor(
  availability: 'available' | 'reserved' | 'sold' | 'unavailable' | string,
  ownReservation: unknown | null,
): ReserveAction {
  if (ownReservation) return 'booked';
  if (availability === 'available') return 'reserve';
  return 'blocked';
}
