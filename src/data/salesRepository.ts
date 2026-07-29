import {
  QuotationBody,
  ReservationBody,
  salesApi,
  TestDriveBody,
  TradeInBody,
} from '../api/sales';
import { APP } from '../constants/app';

/**
 * Buying-journey actions. Each returns a reference the confirmation screen
 * shows, so a booking is traceable back to a real record.
 */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Short human reference derived from a record id. */
const ref = (id: string) => `ELZ-${id.replace(/\D/g, '').slice(-4).padStart(4, '0')}`;

export async function bookTestDrive(body: TestDriveBody): Promise<{ reference: string }> {
  if (APP.useMock) {
    await delay(700);
    return { reference: `ELZ-${(Date.now() % 10000).toString().padStart(4, '0')}` };
  }
  const res = await salesApi.bookTestDrive(body);
  return { reference: ref(res.id) };
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
