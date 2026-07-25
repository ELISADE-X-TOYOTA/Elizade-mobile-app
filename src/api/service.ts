import { ServiceAppointment, ServiceHistoryItem, ServiceJob, ServiceType } from '../domain/types';
import { apiFetch } from './client';

/** Service endpoints. Paths mirror the expected Elizade backend; the
 *  repository falls back to mock data until these are live. */

export interface CreateAppointmentBody {
  vehicleId: string;
  branchId: string;
  serviceType: ServiceType;
  scheduledAt: string;
  issueDescription: string;
  mileageAtBooking: number;
}

export const serviceApi = {
  listAppointments: () => apiFetch<ServiceAppointment[]>('/service/appointments'),
  getJob: (appointmentId: string) => apiFetch<ServiceJob>(`/service/appointments/${appointmentId}/job`),
  history: () => apiFetch<ServiceHistoryItem[]>('/service/history'),
  create: (body: CreateAppointmentBody) =>
    apiFetch<ServiceAppointment>('/service/appointments', { method: 'POST', body }),
  approveWork: (appointmentId: string, workId: string, approve: boolean) =>
    apiFetch<ServiceJob>(`/service/appointments/${appointmentId}/work/${workId}`, {
      method: 'POST',
      body: { approve },
    }),
};
