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

  history: (vehicleId?: string, page = 1, size = 50) =>
    apiFetch<PaginatedDto<ServiceHistoryDto>>('/service/history', { query: { vehicleId, page, size } }),

  create: (body: CreateAppointmentBody) =>
    apiFetch<ServiceAppointmentDto>('/service/appointments', { method: 'POST', body }),

  /** Approve or decline extra work found mid-service. */
  decideAdditionalWork: (jobId: string, workId: string, approve: boolean) =>
    apiFetch<unknown>(`/service/jobs/${jobId}/additional-work/${workId}`, {
      method: 'PATCH',
      body: { decision: approve ? 'approved' : 'rejected' },
    }),
};
