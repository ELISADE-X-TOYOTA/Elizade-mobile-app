import {
  AppNotification,
  ClaimStatus,
  NotificationType,
  OwnedVehicle,
  RecallNotice,
  RecallSeverity,
  RecallStatus,
  ServiceAppointment,
  ServiceHistoryItem,
  ServiceJob,
  ServiceType,
  SupportTicket,
  TicketCategory,
  TicketMessage,
  TicketStatus,
  WarrantyCertificate,
  WarrantyClaim,
  WarrantyStatus,
} from '../domain/types';
import type {
  CustomerRecallDto,
  NotificationDto,
  OwnedVehicleDto,
  ServiceAppointmentDto,
  ServiceHistoryDto,
  ServiceTrackDto,
  TicketDetailDto,
  TicketListDto,
  TicketMessageDto,
  WarrantyCertificateDto,
  WarrantyClaimDto,
} from './dto';

/**
 * Backend DTO → mobile domain translation.
 *
 * The API is the source of truth for data; these functions absorb the naming
 * and enum differences (vehicleLabel→vehicleTitle, isRead→read, the recall
 * severity scale, …) so no screen has to know the wire format.
 */

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
};

// ── Ownership / garage ───────────────────────────────────────────────

/** Service interval used to derive the next due milestone (backend has none). */
const SERVICE_INTERVAL_KM = 5000;
const SERVICE_INTERVAL_DAYS = 182; // ~6 months

export function mapOwnedVehicle(d: OwnedVehicleDto): OwnedVehicle {
  // The API doesn't expose a next-service milestone, so derive one the same way
  // the service desk would: the next 5,000 km step, ~6 months from purchase.
  const nextMileage = (Math.floor(d.mileage / SERVICE_INTERVAL_KM) + 1) * SERVICE_INTERVAL_KM;
  const base = d.purchaseDate ? new Date(d.purchaseDate).getTime() : Date.now();
  const elapsed = Math.max(0, Date.now() - base);
  const periods = Math.floor(elapsed / (SERVICE_INTERVAL_DAYS * 86_400_000)) + 1;
  const nextDue = new Date(base + periods * SERVICE_INTERVAL_DAYS * 86_400_000);

  return {
    id: d.id,
    vin: d.vin,
    make: d.make,
    model: d.model,
    trim: d.trim,
    year: d.year,
    color: d.color,
    colorHex: '#C7CBD0', // not returned by the API; neutral placeholder swatch
    mileage: d.mileage,
    registrationNumber: d.registrationNumber,
    nextServiceDue: nextDue.toISOString(),
    nextServiceMileage: nextMileage,
    image: d.imageUrl ?? '',
  };
}

// ── Service ──────────────────────────────────────────────────────────

const SERVICE_TYPES: ServiceType[] = ['periodic', 'repair', 'inspection', 'recall'];
const asServiceType = (v: string): ServiceType =>
  SERVICE_TYPES.includes(v as ServiceType) ? (v as ServiceType) : 'periodic';

export function mapAppointment(d: ServiceAppointmentDto, image = ''): ServiceAppointment {
  return {
    id: d.id,
    vehicleId: d.vehicleId,
    vehicleTitle: d.vehicleLabel,
    vehicleImage: image,
    branchName: d.branchName,
    serviceType: asServiceType(d.serviceType),
    scheduledAt: d.scheduledAt,
    status: d.status as ServiceAppointment['status'],
    issueDescription: d.issueDescription ?? '',
    mileageAtBooking: d.mileageAtBooking ?? 0,
  };
}

/** `/service/appointments/{id}/track` → the job shape the tracking screen uses. */
export function mapServiceJob(d: ServiceTrackDto): ServiceJob | null {
  const job = d.job;
  if (!job) return null;

  const pending = (job.additionalWork ?? []).find((w) => w.status === 'pending_approval')
    ?? (job.additionalWork ?? [])[0];

  return {
    appointmentId: d.appointment.id,
    estimatedCompletion:
      job.estimatedCompletion ?? d.appointment.estimatedCompletion ?? new Date().toISOString(),
    technicianNotes: d.appointment.technicianNotes ?? undefined,
    stages: [...(job.stages ?? [])]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({
        label: s.label,
        completed: s.completed,
        timestamp: s.completedAt ?? undefined,
      })),
    additionalWork: pending
      ? {
          id: pending.id,
          description: pending.description,
          cost: num(pending.cost),
          status:
            pending.status === 'approved'
              ? 'approved'
              : pending.status === 'rejected'
                ? 'rejected'
                : 'pending_approval',
        }
      : undefined,
    invoice: job.invoice
      ? {
          subtotal: num(job.invoice.subtotal),
          tax: num(job.invoice.tax),
          total: num(job.invoice.total),
          lineItems: [...(job.invoice.lineItems ?? [])]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((li) => ({ description: li.description, amount: num(li.amount) })),
        }
      : undefined,
  };
}

export function mapServiceHistory(d: ServiceHistoryDto): ServiceHistoryItem {
  return {
    id: d.id,
    vehicleId: d.ownedVehicleId,
    date: d.performedAt,
    type: d.serviceType,
    branchName: d.branchName,
    mileage: d.mileage,
    description: d.description,
    cost: num(d.cost),
  };
}

// ── Warranty ─────────────────────────────────────────────────────────

const WARRANTY_STATUSES: WarrantyStatus[] = ['active', 'expired', 'extended'];

export function mapCertificate(d: WarrantyCertificateDto, vin = ''): WarrantyCertificate {
  return {
    id: d.id,
    vehicleId: '',
    vehicleTitle: d.vehicleLabel,
    vin,
    coverageType: d.type === 'standard' ? 'Toyota Manufacturer Warranty' : d.type,
    status: WARRANTY_STATUSES.includes(d.status as WarrantyStatus)
      ? (d.status as WarrantyStatus)
      : 'active',
    startDate: d.coverageStart,
    endDate: d.coverageEnd,
    mileageLimit: 100_000, // not exposed by the API; standard Toyota limit
    coverageItems: d.coverageDetails ?? [],
  };
}

/** Backend severity is low|medium|high|critical; the UI uses a 3-step scale. */
function mapSeverity(v: string): RecallSeverity {
  if (v === 'critical') return 'critical';
  if (v === 'high') return 'important';
  return 'informational';
}

export function mapRecall(d: CustomerRecallDto): RecallNotice {
  const status: RecallStatus = d.serviceCompletedAt ? 'resolved' : d.isActive ? 'open' : 'resolved';
  return {
    id: d.id,
    reference: d.referenceCode,
    title: d.title,
    description: d.description,
    severity: mapSeverity(d.severity),
    issuedAt: d.notifiedAt ?? new Date().toISOString(),
    status,
  };
}

const CLAIM_STATUSES: ClaimStatus[] = [
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'escalated',
  'closed',
];

export function mapClaim(d: WarrantyClaimDto): WarrantyClaim {
  return {
    id: d.id,
    vehicleTitle: d.vehicleLabel,
    category: d.claimType,
    description: d.description,
    status: CLAIM_STATUSES.includes(d.status as ClaimStatus)
      ? (d.status as ClaimStatus)
      : 'submitted',
    submittedAt: d.createdAt,
  };
}

// ── Support ──────────────────────────────────────────────────────────

const TICKET_CATEGORIES: TicketCategory[] = ['sales', 'service', 'warranty', 'billing', 'general'];
const TICKET_STATUSES: TicketStatus[] = [
  'open',
  'assigned',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
];

export function mapTicket(d: TicketListDto | TicketDetailDto, lastMessage = ''): SupportTicket {
  const messages = (d as TicketDetailDto).messages;
  return {
    id: d.id,
    reference: d.ticketNumber,
    subject: d.subject,
    category: TICKET_CATEGORIES.includes(d.category as TicketCategory)
      ? (d.category as TicketCategory)
      : 'general',
    status: TICKET_STATUSES.includes(d.status as TicketStatus)
      ? (d.status as TicketStatus)
      : 'open',
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    lastMessage: lastMessage || messages?.[messages.length - 1]?.body || d.subject,
    satisfactionRating: d.satisfactionRating ?? undefined,
  };
}

export function mapTicketMessage(m: TicketMessageDto, ticketId: string): TicketMessage {
  const isCustomer = m.senderType === 'customer';
  return {
    id: m.id,
    ticketId,
    author: isCustomer ? 'customer' : 'agent',
    authorName: isCustomer ? 'You' : (m.senderName ?? 'Elizade Support'),
    body: m.body,
    createdAt: m.createdAt,
  };
}

// ── Notifications ────────────────────────────────────────────────────

/** Backend category → the icon/tone bucket the notifications screen uses. */
const NOTIFICATION_TYPE: Record<string, NotificationType> = {
  service: 'service',
  sales: 'booking',
  warranty: 'recall',
  support: 'ticket',
  promo: 'offer',
  system: 'general',
};

export function mapNotification(d: NotificationDto): AppNotification {
  return {
    id: d.id,
    type: NOTIFICATION_TYPE[d.category] ?? 'general',
    title: d.title,
    body: d.body,
    createdAt: d.createdAt,
    read: d.isRead,
    route: d.deepLink ?? undefined,
  };
}
