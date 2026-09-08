import {
  APPOINTMENT_STATUS_META,
  AppointmentStatus,
  ServiceAppointment,
  TEST_DRIVE_STATUS_META,
  TestDriveBooking,
  TestDriveStatus,
  Tone,
} from './types';

/**
 * Merging the two kinds of booking a customer can make.
 *
 * The Bookings tab used to be backed solely by `GET /sales/test-drives`, so a
 * service appointment simply was not there — it lived in the Service tab, and
 * a customer looking at a screen called "Bookings" saw half of theirs.
 *
 * Kept free of React and expo-router so the rules below can be tested in plain
 * node. They are all the sort that fail quietly: a status left out of the
 * "upcoming" set does not throw, it just hides a live booking under a tab
 * nobody opens.
 */

export type BookingKind = 'testDrive' | 'service';

/** Statuses that mean "still ahead of you", per kind. */
export const UPCOMING_TEST_DRIVE: TestDriveStatus[] = ['requested', 'confirmed'];

export const UPCOMING_SERVICE: AppointmentStatus[] = [
  'requested',
  'confirmed',
  // A car currently in the workshop, or one waiting on the customer to approve
  // extra work, is very much a live booking — burying either under "Past"
  // would hide the one thing actually needing attention.
  'in_progress',
  'awaiting_approval',
];

/**
 * One row of the list, whatever produced it.
 *
 * Test drives and service appointments come from different endpoints with
 * different shapes and different status vocabularies. Normalising once keeps
 * the card ignorant of which it is rendering, so the two cannot drift into
 * looking like different features.
 *
 * `targetId` is deliberately an id and not a callback: navigation belongs to
 * the screen, and keeping it out of here is what lets this module be tested
 * without a navigator.
 */
export interface BookingItem {
  key: string;
  kind: BookingKind;
  title: string;
  branchName: string;
  scheduledAt: string;
  statusLabel: string;
  tone: Tone;
  upcoming: boolean;
  /** Lead id for a test drive, appointment id for a service. `null` = nothing to open. */
  targetId: string | null;
}

export function fromTestDrive(booking: TestDriveBooking): BookingItem {
  const meta = TEST_DRIVE_STATUS_META[booking.status];
  return {
    // PREFIXED. The two ids come from different tables and nothing guarantees
    // they differ; an unprefixed key would let one row silently replace
    // another in the list.
    key: `test-drive-${booking.id}`,
    kind: 'testDrive',
    title: booking.vehicleLabel,
    branchName: booking.branchName,
    scheduledAt: booking.scheduledAt,
    /*
      THE LIVE STAGE, NOT `booking.status`.

      `status` is written once when the booking is created and never advanced —
      there is no admin endpoint for test drive bookings at all. Sales staff
      move the LEAD through the pipeline, which is why a customer watched their
      request sit on "Requested" while it was actually being worked.

      Falls back to the frozen status only for rows that predate lead linking,
      which is the one case where there is nothing better to show.
    */
    statusLabel: booking.leadStageLabel ?? meta.label,
    tone: meta.tone,
    upcoming: UPCOMING_TEST_DRIVE.includes(booking.status),
    targetId: booking.leadId ?? null,
  };
}

export function fromAppointment(appointment: ServiceAppointment): BookingItem {
  const meta = APPOINTMENT_STATUS_META[appointment.status];
  return {
    key: `service-${appointment.id}`,
    kind: 'service',
    title: appointment.vehicleTitle,
    branchName: appointment.branchName,
    scheduledAt: appointment.scheduledAt,
    statusLabel: meta.label,
    tone: meta.tone,
    upcoming: UPCOMING_SERVICE.includes(appointment.status),
    targetId: appointment.id,
  };
}

/**
 * Both sources, filtered to one tab and ordered by date.
 *
 * Sorting is not cosmetic once two feeds are interleaved: unsorted, every test
 * drive sits above every service visit regardless of date, which reads as a
 * broken list. Soonest first when looking ahead, most recent first when
 * looking back — in both cases the row a customer wants is at the top.
 */
export function selectBookings(
  testDrives: TestDriveBooking[],
  appointments: ServiceAppointment[],
  upcoming: boolean,
): BookingItem[] {
  return [...testDrives.map(fromTestDrive), ...appointments.map(fromAppointment)]
    .filter((item) => item.upcoming === upcoming)
    .sort((a, b) => {
      const at = new Date(a.scheduledAt).getTime();
      const bt = new Date(b.scheduledAt).getTime();
      return upcoming ? at - bt : bt - at;
    });
}
