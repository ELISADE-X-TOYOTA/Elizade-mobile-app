import { CreateAppointmentBody, serviceApi } from '../api/service';
import { APP } from '../constants/app';
import {
  ServiceAppointment,
  ServiceHistoryItem,
  ServiceJob,
} from '../domain/types';
import {
  ownedVehicleById,
  SERVICE_APPOINTMENTS,
  SERVICE_HISTORY,
  SERVICE_JOBS,
  SHOWROOMS,
} from './mock';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** In-memory mock store so a newly-booked appointment appears in the list. */
let mockAppointments: ServiceAppointment[] = [...SERVICE_APPOINTMENTS];
const mockJobs: Record<string, ServiceJob> = { ...SERVICE_JOBS };

export async function fetchAppointments(): Promise<ServiceAppointment[]> {
  if (APP.useMock) {
    await delay(450);
    return [...mockAppointments];
  }
  return serviceApi.listAppointments();
}

export async function fetchServiceJob(appointmentId: string): Promise<ServiceJob | null> {
  if (APP.useMock) {
    await delay(300);
    return mockJobs[appointmentId] ?? null;
  }
  try {
    return await serviceApi.getJob(appointmentId);
  } catch {
    return null;
  }
}

export async function fetchServiceHistory(): Promise<ServiceHistoryItem[]> {
  if (APP.useMock) {
    await delay(300);
    return SERVICE_HISTORY;
  }
  return serviceApi.history();
}

export async function createAppointment(body: CreateAppointmentBody): Promise<ServiceAppointment> {
  if (APP.useMock) {
    await delay(700);
    const owned = ownedVehicleById(body.vehicleId);
    const branch = SHOWROOMS.find((s) => s.id === body.branchId);
    const appt: ServiceAppointment = {
      id: `sa${Date.now()}`,
      vehicleId: body.vehicleId,
      vehicleTitle: `${owned.make} ${owned.model}`,
      vehicleImage: owned.image,
      branchName: branch?.name ?? 'Elizade Service Centre',
      serviceType: body.serviceType,
      scheduledAt: body.scheduledAt,
      status: 'requested',
      issueDescription: body.issueDescription,
      mileageAtBooking: body.mileageAtBooking,
    };
    mockAppointments = [appt, ...mockAppointments];
    return appt;
  }
  return serviceApi.create(body);
}

export async function approveAdditionalWork(
  appointmentId: string,
  workId: string,
  approve: boolean,
): Promise<ServiceJob | null> {
  if (APP.useMock) {
    await delay(500);
    const job = mockJobs[appointmentId];
    if (job?.additionalWork && job.additionalWork.id === workId) {
      job.additionalWork = { ...job.additionalWork, status: approve ? 'approved' : 'rejected' };
    }
    return job ?? null;
  }
  return serviceApi.approveWork(appointmentId, workId, approve);
}
