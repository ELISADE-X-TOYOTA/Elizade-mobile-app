/**
 * Wire shapes returned by the Elizade FastAPI backend, transcribed from its
 * OpenAPI schema. These are the *transport* types — screens never see them;
 * `customer-mappers.ts` translates them into the domain model.
 *
 * Money fields arrive as strings (Decimal serialisation), so parse before use.
 */

// ── Ownership ────────────────────────────────────────────────────────
export interface OwnedVehicleDto {
  id: string;
  vin: string;
  make: string;
  model: string;
  trim: string;
  year: number;
  color: string;
  registrationNumber: string;
  mileage: number;
  purchaseDate: string | null;
  isPrimary: boolean;
  imageUrl: string | null;
}

export interface VinLookupDto {
  found: boolean;
  vehicleLabel?: string | null;
  alreadyClaimed?: boolean;
  message?: string | null;
}

export interface OwnershipRequestDto {
  id: string;
  vin: string;
  status: string;
  createdAt: string;
}

// ── Service ──────────────────────────────────────────────────────────
export interface ServiceAppointmentDto {
  id: string;
  vehicleId: string;
  vehicleLabel: string;
  serviceType: string;
  scheduledAt: string;
  status: string;
  branchId: string;
  branchName: string;
  jobId: string | null;
  pendingAdditionalWork: boolean;
  /** Present on the detail (track) payload only. */
  issueDescription?: string;
  mileageAtBooking?: number;
}

export interface JobStageDto {
  id: string;
  label: string;
  completed: boolean;
  completedAt: string | null;
  sortOrder: number;
}

export interface AdditionalWorkDto {
  id: string;
  description: string;
  cost: string;
  status: string;
  customerRespondedAt: string | null;
  createdAt: string;
}

export interface InvoiceLineDto {
  id: string;
  description: string;
  amount: string;
  sortOrder: number;
}

export interface JobInvoiceDto {
  id: string;
  subtotal: string;
  tax: string;
  total: string;
  issuedAt: string;
  lineItems: InvoiceLineDto[];
}

export interface JobDetailDto {
  id: string;
  appointmentId: string;
  status: string;
  estimatedCompletion: string | null;
  stages: JobStageDto[];
  additionalWork: AdditionalWorkDto[];
  invoice: JobInvoiceDto | null;
}

export interface ServiceTrackDto {
  appointment: ServiceAppointmentDto & {
    technicianNotes: string | null;
    estimatedCompletion: string | null;
  };
  job: JobDetailDto | null;
}

export interface ServiceHistoryDto {
  id: string;
  ownedVehicleId: string;
  vehicleLabel: string;
  branchName: string;
  serviceType: string;
  performedAt: string;
  mileage: number;
  description: string;
  cost: string;
}

export interface PaginatedDto<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// ── Warranty ─────────────────────────────────────────────────────────
export interface WarrantyCertificateDto {
  id: string;
  certificateNumber: string;
  type: string;
  status: string;
  vehicleLabel: string;
  coverageStart: string;
  coverageEnd: string;
  coverageDetails: string[];
}

export interface CustomerRecallDto {
  id: string;
  recallId: string;
  referenceCode: string;
  title: string;
  description: string;
  severity: string;
  vehicleLabel: string;
  notifiedAt: string | null;
  serviceCompletedAt: string | null;
  isActive: boolean;
}

export interface WarrantyClaimDto {
  id: string;
  claimType: string;
  description: string;
  status: string;
  vehicleLabel: string;
  createdAt: string;
  updatedAt: string;
}

// ── Support ──────────────────────────────────────────────────────────
export interface TicketMessageDto {
  id: string;
  senderType: string;
  senderName: string | null;
  body: string;
  createdAt: string;
}

export interface TicketListDto {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  slaStatus: string;
  createdAt: string;
  updatedAt: string;
  satisfactionRating: number | null;
}

export interface TicketDetailDto extends TicketListDto {
  messages: TicketMessageDto[];
}

// ── Notifications ────────────────────────────────────────────────────
export interface NotificationDto {
  id: string;
  title: string;
  body: string;
  category: string;
  isRead: boolean;
  deepLink: string | null;
  createdAt: string;
}

// ── Sales ────────────────────────────────────────────────────────────
export interface TestDriveDto {
  id: string;
  vehicleId: string;
  branchId: string;
  scheduledAt: string;
  status: string;
  createdAt: string;
}

export interface ReservationDto {
  id: string;
  vehicleId: string;
  depositAmount: string | null;
  status: string;
  createdAt: string;
}

export interface QuotationDto {
  id: string;
  vehicleId: string;
  status: string;
  totalAmount?: string | null;
  createdAt: string;
}

export interface TradeInDto {
  id: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  status: string;
  estimatedValue?: string | null;
  createdAt: string;
}
