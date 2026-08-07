import {
  QuotationBody,
  ReservationBody,
  salesApi,
  TestDriveBody,
  TradeInBody,
} from '../api/sales';
import type { TestDriveDto } from '../api/dto';
import { APP } from '../constants/app';
import { TestDriveBooking, TestDriveStatus } from '../domain/types';

/**
 * Buying-journey actions. Each returns a reference the confirmation screen
 * shows, so a booking is traceable back to a real record.
 */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Short human reference derived from a record id. */
const ref = (id: string) => `ELZ-${id.replace(/\D/g, '').slice(-4).padStart(4, '0')}`;

const STATUSES: TestDriveStatus[] = ['requested', 'confirmed', 'completed', 'cancelled'];

function mapTestDrive(d: TestDriveDto): TestDriveBooking {
  const status = (STATUSES.includes(d.status as TestDriveStatus) ? d.status : 'requested') as TestDriveStatus;
  return {
    id: d.id,
    vehicleId: d.vehicleId,
    vehicleLabel: d.vehicleLabel || 'Vehicle',
    branchId: d.branchId,
    branchName: d.branchName || 'Elizade',
    scheduledAt: d.scheduledAt,
    status,
    notes: d.notes,
    leadId: d.leadId,
    createdAt: d.createdAt,
  };
}

export async function bookTestDrive(body: TestDriveBody): Promise<{ reference: string; booking: TestDriveBooking }> {
  if (APP.useMock) {
    await delay(700);
    const id = `td-${Date.now()}`;
    const booking: TestDriveBooking = {
      id,
      vehicleId: body.vehicleId,
      vehicleLabel: 'Demo Vehicle',
      branchId: body.branchId,
      branchName: 'Elizade Showroom',
      scheduledAt: body.scheduledAt,
      status: 'requested',
      notes: body.notes,
      leadId: `lead-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    return { reference: ref(id), booking };
  }
  const res = await salesApi.bookTestDrive(body);
  return { reference: ref(res.id), booking: mapTestDrive(res) };
}

export async function listTestDrives(): Promise<TestDriveBooking[]> {
  if (APP.useMock) {
    await delay(400);
    return [];
  }
  const rows = await salesApi.listTestDrives();
  return rows.map(mapTestDrive);
}

export async function reserveVehicle(body: ReservationBody): Promise<{ reference: string }> {
  if (APP.useMock) {
    await delay(700);
    return { reference: `ELZ-${(Date.now() % 10000).toString().padStart(4, '0')}` };
  }
  const res = await salesApi.reserve(body);
  return { reference: ref(res.id) };
}

export async function requestQuote(body: QuotationBody): Promise<{ reference: string }> {
  if (APP.useMock) {
    await delay(700);
    return { reference: `ELZ-${(Date.now() % 10000).toString().padStart(4, '0')}` };
  }
  const res = await salesApi.requestQuote(body);
  return { reference: ref(res.id) };
}

export async function submitTradeIn(
  body: TradeInBody,
): Promise<{ reference: string; estimatedValue?: number }> {
  if (APP.useMock) {
    await delay(900);
    return { reference: `ELZ-${(Date.now() % 10000).toString().padStart(4, '0')}` };
  }
  const res = await salesApi.submitTradeIn(body);
  return {
    reference: ref(res.id),
    estimatedValue: res.estimatedValue != null ? Number(res.estimatedValue) : undefined,
  };
}
