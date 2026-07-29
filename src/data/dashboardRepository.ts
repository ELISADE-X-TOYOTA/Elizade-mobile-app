import { DashboardSummaryDto, dashboardApi } from '../api/dashboard';
import { APP } from '../constants/app';
import { OWNED_VEHICLES, SERVICE_APPOINTMENTS } from './mock';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Offline stand-in built from the bundled demo content. */
function mockSummary(): DashboardSummaryDto {
  const v = OWNED_VEHICLES[0];
  const next = SERVICE_APPOINTMENTS.find((a) => a.status === 'confirmed' || a.status === 'requested');
  return {
    ownedVehiclesCount: OWNED_VEHICLES.length,
    primaryVehicle: v
      ? {
          id: v.id,
          label: `${v.year} ${v.make} ${v.model}`,
          registrationNumber: v.registrationNumber,
          mileage: v.mileage,
          nextServiceDue: v.nextServiceDue,
          nextServiceMileage: v.nextServiceMileage,
        }
      : null,
    upcomingAppointments: SERVICE_APPOINTMENTS.length,
    nextAppointment: next
      ? {
          id: next.id,
          vehicleLabel: next.vehicleTitle,
          serviceType: next.serviceType,
          scheduledAt: next.scheduledAt,
          status: next.status,
          branchName: next.branchName,
        }
      : null,
    pendingAdditionalWork: 1,
    openSupportTickets: 2,
    unreadNotifications: 3,
    activeWarrantyCertificates: 1,
    pendingWarrantyClaims: 1,
    activeRecalls: 1,
    watchlistCount: 0,
    pendingOwnershipRequests: 0,
    pendingReservations: 0,
    pendingQuotations: 0,
    pendingTradeIns: 0,
    upcomingTestDrives: 0,
  };
}

export async function fetchDashboardSummary(): Promise<DashboardSummaryDto> {
  if (APP.useMock) {
    await delay(350);
    return mockSummary();
  }
  return dashboardApi.summary();
}
