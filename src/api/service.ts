import { ServiceType } from '../domain/types';
import { apiFetch } from './client';
import type {
  PaginatedDto,
  ServiceAppointmentDto,
  ServiceHistoryDto,
  ServiceTrackDto,
} from './dto';

/** Customer service endpoints — backend `/service` router. */

export interface CreateAppointmentBody {
  ownedVehicleId: string;
  branchId: string;
  serviceType: ServiceType;
  /** ISO 8601 datetime. */
  scheduledAt: string;
  mileageAtBooking: number;
  issueDescription: string;
}

export const serviceApi = {
  listAppointments: () => apiFetch<ServiceAppointmentDto[]>('/service/appointments'),

  /** Appointment + live job (stages, additional work, invoice). */
  track: (appointmentId: string) =>
    apiFetch<ServiceTrackDto>(`/service/appointments/${appointmentId}/track`),

  /**
   * `vehicleId` filters SERVER-side. Fetching everything and filtering on the
   * device silently loses records once a customer's total history exceeds one
   * page — older entries for the requested vehicle simply fall off page 1.
   */
  history: (opts: { vehicleId?: string; page?: number; size?: number } = {}) =>
    apiFetch<PaginatedDto<ServiceHistoryDto>>('/service/history', {
      query: { vehicleId: opts.vehicleId, page: opts.page ?? 1, size: opts.size ?? 50 },
    }),

  create: (body: CreateAppointmentBody) =>
    apiFetch<ServiceAppointmentDto>('/service/appointments', { method: 'POST', body }),

  /** Approve or decline extra work found mid-service. */
  decideAdditionalWork: (jobId: string, workId: string, approve: boolean) =>
    apiFetch<unknown>(`/service/jobs/${jobId}/additional-work/${workId}`, {
      method: 'PATCH',
      body: { decision: approve ? 'approved' : 'rejected' },
    }),
};
