/** Domain models — mirror the Elizade web API (src/types/index.ts). */

export type VehicleCategory =
  | 'suv'
  | 'sedan'
  | 'electric'
  | 'luxury'
  | 'sports'
  | 'pickup'
  | 'truck';

export type ListingType = 'rent' | 'sale' | 'auction';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  trim: string;
  year: number;
  color: string;
  colorHex: string;
  price: number;
  rentPerDay?: number;
  category: VehicleCategory;
  fuelType: string;
  transmission: string;
  engine: string;
  seats: number;
  mileage: number;
  horsepower: number;
  rating: number;
  reviewCount: number;
  location: string;
  images: string[];
  features: string[];
  /**
   * Free-form spec bag straight from the backend's `vehicles.specs` JSONB.
   *
   * This is the ONLY trustworthy source of detailed specs. `seats` and
   * `horsepower` above are synthesised per-category by the mapper for card
   * display, so they are identical for every SUV and must never be presented
   * as real, comparable figures — see `buildComparison`.
   *
   * Empty `{}` on list results: `GET /vehicles` omits specs, only the detail
   * endpoint returns them.
   */
  specs: Record<string, string>;
  listingTypes: ListingType[];
  ownerHistory: number;
  isVerified: boolean;
  dealerName: string;
}

export type BookingStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  reference: string;
  vehicleId: string;
  vehicleTitle: string;
  vehicleImage: string;
  startDate: Date;
  endDate: Date;
  pickupLocation: string;
  total: number;
  status: BookingStatus;
  isRental: boolean;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  /** Optional middle / other name. */
  otherName?: string | null;
  email: string;
  phone: string;
  city: string;
  avatar?: string;
  role: 'customer' | 'staff' | 'admin';
}

export interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────
export const vehicleTitle = (v: Vehicle) => `${v.make} ${v.model}`;
export const vehicleSubtitle = (v: Vehicle) => `${v.trim} · ${v.year}`;
export const canRent = (v: Vehicle) =>
  v.listingTypes.includes('rent') && v.rentPerDay != null;
export const fullName = (u: UserProfile) => `${u.firstName} ${u.lastName}`.trim();
export const initials = (u: UserProfile) =>
  `${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase();

export const CATEGORY_META: Record<
  VehicleCategory,
  { label: string; icon: string }
> = {
  suv: { label: 'SUV', icon: 'car-estate' },
  sedan: { label: 'Sedan', icon: 'car' },
  electric: { label: 'Electric', icon: 'car-electric' },
  luxury: { label: 'Luxury', icon: 'car-sports' },
  sports: { label: 'Sports', icon: 'racing-helmet' },
  pickup: { label: 'Pickup', icon: 'car-pickup' },
  truck: { label: 'Truck', icon: 'truck' },
};

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  upcoming: 'Upcoming',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/** Backend `TestDriveStatus` values from POST/GET /sales/test-drives. */
export type TestDriveStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled';

export interface TestDriveBooking {
  id: string;
  vehicleId: string;
  vehicleLabel: string;
  branchId: string;
  branchName: string;
  scheduledAt: string;
  status: TestDriveStatus;
  notes?: string | null;
  leadId?: string | null;
  createdAt: string;
}

export const TEST_DRIVE_STATUS_META: Record<
  TestDriveStatus,
  { label: string; tone: 'info' | 'success' | 'warning' | 'error' }
> = {
  requested: { label: 'Requested', tone: 'info' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'error' },
};

/** Customer watchlist entry — backend tracks model (+ optional trim/colour). */
/**
 * A model the customer is tracking.
 *
 * The backend keys these on `model` alone — `trim` and `color` refine the
 * interest, they do not identify a listing. The heart on a car card toggles
 * one of these, so hearting any Land Cruiser marks the whole model as tracked.
 */
export interface WatchlistItem {
  id: string;
  model: string;
  trim: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: string;
}

// ── Service & ownership (mirrors web src/types) ──────────────────────
export interface OwnedVehicle {
  id: string;
  vin: string;
  make: string;
  model: string;
  trim: string;
  year: number;
  color: string;
  colorHex: string;
  mileage: number;
  registrationNumber: string;
  nextServiceDue: string; // ISO date
  nextServiceMileage: number;
  image: string;
}

export type ServiceType = 'periodic' | 'repair' | 'inspection' | 'recall';

export type AppointmentStatus =
  | 'requested'
  | 'confirmed'
  | 'in_progress'
  | 'awaiting_approval'
  | 'completed'
  | 'cancelled';

export interface ServiceAppointment {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  vehicleImage: string;
  branchName: string;
  serviceType: ServiceType;
  scheduledAt: string; // ISO
  status: AppointmentStatus;
  issueDescription: string;
  mileageAtBooking: number;
}

export interface ServiceStage {
  label: string;
  completed: boolean;
  timestamp?: string;
}

export interface AdditionalWork {
  id: string;
  description: string;
  cost: number;
  status: 'pending_approval' | 'approved' | 'rejected';
}

export interface ServiceInvoice {
  subtotal: number;
  tax: number;
  total: number;
  lineItems: { description: string; amount: number }[];
}

export interface ServiceJob {
  appointmentId: string;
  stages: ServiceStage[];
  estimatedCompletion: string; // ISO
  technicianNotes?: string;
  additionalWork?: AdditionalWork;
  invoice?: ServiceInvoice;
}

export interface ServiceHistoryItem {
  id: string;
  vehicleId: string;
  date: string; // ISO
  type: string;
  branchName: string;
  mileage: number;
  description: string;
  cost: number;
}

export const SERVICE_TYPE_META: Record<
  ServiceType,
  { label: string; icon: string; description: string }
> = {
  periodic: { label: 'Periodic Maintenance', icon: 'oil', description: 'Scheduled service & oil change' },
  repair: { label: 'Repair', icon: 'wrench', description: 'Fix a fault or issue' },
  inspection: { label: 'Inspection', icon: 'clipboard-check', description: 'Full vehicle health check' },
  recall: { label: 'Recall Service', icon: 'alert', description: 'Manufacturer recall work' },
};

export const APPOINTMENT_STATUS_META: Record<
  AppointmentStatus,
  { label: string; tone: 'info' | 'success' | 'warning' | 'muted' }
> = {
  requested: { label: 'Requested', tone: 'info' },
  confirmed: { label: 'Confirmed', tone: 'info' },
  in_progress: { label: 'In Progress', tone: 'success' },
  awaiting_approval: { label: 'Needs Approval', tone: 'warning' },
  completed: { label: 'Completed', tone: 'muted' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
};

// ── Warranty & recalls (Phase 3, mirrors web warranty-api) ───────────
export type Tone = 'info' | 'success' | 'warning' | 'error' | 'muted';

export type WarrantyStatus = 'active' | 'expired' | 'extended';

export interface WarrantyCertificate {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  vin: string;
  coverageType: string;
  status: WarrantyStatus;
  startDate: string;
  endDate: string;
  mileageLimit: number;
  coverageItems: string[];
}

export type RecallSeverity = 'critical' | 'important' | 'informational';
export type RecallStatus = 'open' | 'scheduled' | 'resolved';

export interface RecallNotice {
  id: string;
  reference: string;
  title: string;
  description: string;
  severity: RecallSeverity;
  issuedAt: string;
  status: RecallStatus;
}

/** Mirrors the backend ClaimStatus enum. */
export type ClaimStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'closed';

export type BatteryWarrantyStatus = 'unknown' | 'free' | 'partial' | 'expired';

/** Answer from `GET /warranty/eligibility`, shown before a claim is filed. */
export interface WarrantyEligibility {
  eligible: boolean;
  /** Why not, when `eligible` is false — worth showing verbatim. */
  reason?: string | null;
  inServiceDate?: string | null;
  coverageEnd?: string | null;
  mileageLimitKm: number;
  warrantyMonths: number;
  currentMileage: number;
  certificateNumber?: string | null;
  /** Free-replacement window, in months from the in-service date. */
  batteryFreeMonths: number;
  /** Pro-rata window, in months. Cover ends here. */
  batteryPartialMonths: number;
  batteryFreeCoverageEnd?: string | null;
  batteryPartialCoverageEnd?: string | null;
  batteryStatus: BatteryWarrantyStatus;
  /** True during free OR partial cover. Independent of `eligible`. */
  batteryEligible: boolean;
}

export interface WarrantyClaim {
  id: string;
  vehicleTitle: string;
  category: string;
  description: string;
  status: ClaimStatus;
  submittedAt: string;
}

export const WARRANTY_CLAIM_CATEGORIES = [
  'Engine & Drivetrain',
  'Electrical & Electronics',
  'Air Conditioning',
  'Bodywork & Paint',
  'Suspension & Brakes',
  'Other',
];

export const WARRANTY_STATUS_META: Record<WarrantyStatus, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'success' },
  extended: { label: 'Extended', tone: 'info' },
  expired: { label: 'Expired', tone: 'muted' },
};

export const RECALL_SEVERITY_META: Record<RecallSeverity, { label: string; tone: Tone }> = {
  critical: { label: 'Critical', tone: 'error' },
  important: { label: 'Important', tone: 'warning' },
  informational: { label: 'Info', tone: 'info' },
};

export const CLAIM_STATUS_META: Record<ClaimStatus, { label: string; tone: Tone }> = {
  submitted: { label: 'Submitted', tone: 'info' },
  under_review: { label: 'Under Review', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'error' },
  escalated: { label: 'Escalated', tone: 'warning' },
  closed: { label: 'Closed', tone: 'muted' },
};

// ── Support tickets (Phase 4, mirrors web support-api) ───────────────
export type TicketCategory = 'sales' | 'service' | 'warranty' | 'billing' | 'general';
/** Mirrors the backend TicketStatus enum. */
export type TicketStatus =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'waiting_customer'
  | 'resolved'
  | 'closed';

export interface TicketMessage {
  id: string;
  ticketId: string;
  author: 'customer' | 'agent';
  authorName: string;
  body: string;
  /**
   * Absolute image/PDF URLs. Resolved from the API's relative `/media/...`
   * paths at map time so screens never need to know the host.
   */
  attachments: string[];
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  reference: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  lastMessage: string;
  satisfactionRating?: number;
}

export const TICKET_CATEGORY_META: Record<
  TicketCategory,
  { label: string; icon: string; slaHours: number }
> = {
  sales: { label: 'Sales', icon: 'pricetag', slaHours: 4 },
  service: { label: 'Service', icon: 'construct', slaHours: 8 },
  warranty: { label: 'Warranty', icon: 'shield-checkmark', slaHours: 24 },
  billing: { label: 'Billing', icon: 'card', slaHours: 12 },
  general: { label: 'General', icon: 'help-circle', slaHours: 24 },
};

export const TICKET_STATUS_META: Record<TicketStatus, { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'info' },
  assigned: { label: 'Assigned', tone: 'info' },
  in_progress: { label: 'In Progress', tone: 'warning' },
  waiting_customer: { label: 'Awaiting You', tone: 'warning' },
  resolved: { label: 'Resolved', tone: 'success' },
  closed: { label: 'Closed', tone: 'muted' },
};

// ── Notifications (Phase 5) ──────────────────────────────────────────
export type NotificationType = 'service' | 'offer' | 'recall' | 'ticket' | 'booking' | 'general';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  route?: string;
}

export const NOTIFICATION_META: Record<NotificationType, { icon: string; tone: Tone }> = {
  service: { icon: 'construct', tone: 'info' },
  offer: { icon: 'pricetag', tone: 'success' },
  recall: { icon: 'warning', tone: 'warning' },
  ticket: { icon: 'chatbubble-ellipses', tone: 'info' },
  booking: { icon: 'calendar', tone: 'info' },
  general: { icon: 'notifications', tone: 'muted' },
};
