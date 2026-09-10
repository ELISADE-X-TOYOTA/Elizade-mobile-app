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
