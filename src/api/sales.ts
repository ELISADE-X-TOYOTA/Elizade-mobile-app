import { apiFetch } from './client';
import type { QuotationDto, ReservationDto, TestDriveDto, TradeInDto } from './dto';

/**
 * Customer sales endpoints — backend `/sales` router.
 *
 * These back the buying journey on the car-details screen: booking a test
 * drive, reserving with a deposit, requesting a formal quotation, and
 * submitting a vehicle for trade-in valuation.
 */

export interface TestDriveBody {
  vehicleId: string;
  branchId: string;
  /** ISO 8601 datetime. */
  scheduledAt: string;
  notes?: string | null;
}

export interface ReservationBody {
  vehicleId: string;
  depositAmount?: number | null;
}

export interface QuotationBody {
  vehicleId: string;
  notes?: string | null;
}

export interface TradeInBody {
  make: string;
  model: string;
  year: number;
  mileage: number;
  conditionNotes: string;
  photoUrls?: string[];
}

export const salesApi = {
  listTestDrives: () => apiFetch<TestDriveDto[]>('/sales/test-drives'),
  bookTestDrive: (body: TestDriveBody) =>
    apiFetch<TestDriveDto>('/sales/test-drives', { method: 'POST', body }),

  listReservations: () => apiFetch<ReservationDto[]>('/sales/reservations'),
  reserve: (body: ReservationBody) =>
    apiFetch<ReservationDto>('/sales/reservations', { method: 'POST', body }),

  listQuotations: () => apiFetch<QuotationDto[]>('/sales/quotations'),
  requestQuote: (body: QuotationBody) =>
    apiFetch<QuotationDto>('/sales/quotations', { method: 'POST', body }),

  listTradeIns: () => apiFetch<TradeInDto[]>('/sales/trade-ins'),
  submitTradeIn: (body: TradeInBody) =>
    apiFetch<TradeInDto>('/sales/trade-ins', { method: 'POST', body }),
};
