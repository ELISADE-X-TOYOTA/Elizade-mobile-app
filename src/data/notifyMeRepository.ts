import { ApiError } from '../api/client';
import { notifyMeApi, NotifyMeStatusDto } from '../api/notifyMe';
import { APP } from '../constants/app';
import { NotifyMeStatus } from '../domain/types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** In-memory subscriptions keep the demo behaviour identical to the API path. */
let mockSubscriptions: Record<string, NotifyMeStatus> = {};

function mapStatus(dto: NotifyMeStatusDto): NotifyMeStatus {
  return {
    vehicleId: dto.vehicleId,
    subscribed: dto.subscribed,
    subscriptionId: dto.subscriptionId ?? null,
    createdAt: dto.createdAt ?? null,
  };
}

export async function fetchNotifyMeStatus(vehicleId: string): Promise<NotifyMeStatus> {
  if (APP.useMock) {
    await delay(220);
    return (
      mockSubscriptions[vehicleId] ?? {
        vehicleId,
        subscribed: false,
        subscriptionId: null,
        createdAt: null,
      }
    );
  }
  return mapStatus(await notifyMeApi.status(vehicleId));
}

export async function subscribeToNotifyMe(vehicleId: string): Promise<NotifyMeStatus> {
  if (APP.useMock) {
    await delay(320);
    const current = mockSubscriptions[vehicleId];
    if (current?.subscribed) throw new ApiError('You are already subscribed to this alert.', 409);
    const next: NotifyMeStatus = {
      vehicleId,
      subscribed: true,
      subscriptionId: `availability-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    mockSubscriptions = { ...mockSubscriptions, [vehicleId]: next };
    return next;
  }
  return mapStatus(await notifyMeApi.subscribe(vehicleId));
}

export async function unsubscribeFromNotifyMe(vehicleId: string): Promise<void> {
  if (APP.useMock) {
    await delay(240);
    delete mockSubscriptions[vehicleId];
    return;
  }
  await notifyMeApi.unsubscribe(vehicleId);
}
