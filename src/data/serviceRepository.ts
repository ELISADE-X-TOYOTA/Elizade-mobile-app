import { mapAppointment, mapServiceHistory, mapServiceJob } from '../api/customer-mappers';
import { CreateAppointmentBody, serviceApi } from '../api/service';
import { APP } from '../constants/app';
import { ServiceAppointment, ServiceHistoryItem, ServiceJob } from '../domain/types';
import {
  ownedVehicleById,
  SERVICE_APPOINTMENTS,
  SERVICE_HISTORY,
  SERVICE_JOBS,
  SHOWROOMS,
} from './mock';
import { ownedVehicleImage } from './garageRepository';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** In-memory mock store so a newly-booked appointment appears in the list. */
let mockAppointments: ServiceAppointment[] = [...SERVICE_APPOINTMENTS];
const mockJobs: Record<string, ServiceJob> = { ...SERVICE_JOBS };

/** Job id per appointment, captured from the list so the PATCH can address it. */
const jobIdByAppointment = new Map<string, string>();

export async function fetchAppointments(): Promise<ServiceAppointment[]> {
  if (APP.useMock) {
    await delay(450);
    return [...mockAppointments];
  }
  const items = await serviceApi.listAppointments();
  items.forEach((a) => a.jobId && jobIdByAppointment.set(a.id, a.jobId));
  // The list payload has no image, so borrow it from the owned vehicle.
  return items.map((a) => mapAppointment(a, ownedVehicleImage(a.vehicleId)));
}

export async function fetchServiceJob(appointmentId: string): Promise<ServiceJob | null> {
  if (APP.useMock) {
    await delay(300);
    return mockJobs[appointmentId] ?? null;
  }
  try {
    const track = await serviceApi.track(appointmentId);
    if (track.job) jobIdByAppointment.set(appointmentId, track.job.id);
    return mapServiceJob(track);
  } catch {
    return null;
  }
}

export async function fetchServiceHistory(): Promise<ServiceHistoryItem[]> {
  if (APP.useMock) {
    await delay(300);
    return SERVICE_HISTORY;
  }
  const res = await serviceApi.history();
  return (res.items ?? []).map(mapServiceHistory);
}

export async function createAppointment(body: CreateAppointmentBody): Promise<ServiceAppointment> {
  if (APP.useMock) {
    await delay(700);
    const owned = ownedVehicleById(body.ownedVehicleId);
    const branch = SHOWROOMS.find((s) => s.id === body.branchId);
    const appt: ServiceAppointment = {
      id: `sa${Date.now()}`,
      vehicleId: body.ownedVehicleId,
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
  const created = await serviceApi.create(body);
  return mapAppointment(created, ownedVehicleImage(created.vehicleId));
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
  // The decision is addressed to the job, so resolve its id first.
  let jobId = jobIdByAppointment.get(appointmentId);
  if (!jobId) {
    const track = await serviceApi.track(appointmentId);
    jobId = track.job?.id;
    if (jobId) jobIdByAppointment.set(appointmentId, jobId);
  }
  if (!jobId) return null;
  await serviceApi.decideAdditionalWork(jobId, workId, approve);
  return fetchServiceJob(appointmentId);
}
