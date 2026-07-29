import { apiFetch } from './client';

/**
 * Customer dashboard summary — one call that backs the Home screen's
 * "at a glance" panel, instead of fanning out to five separate endpoints.
 */

export interface DashboardPrimaryVehicleDto {
  id: string;
  label: string;
  registrationNumber: string;
  mileage: number;
  /** Authoritative next-service milestone (not exposed on /ownership/vehicles). */
  nextServiceDue: string | null;
  nextServiceMileage: number | null;
}

export interface DashboardNextAppointmentDto {
  id: string;
  vehicleLabel: string;
  serviceType: string;
  scheduledAt: string;
  status: string;
  branchName: string;
}

export interface DashboardSummaryDto {
  ownedVehiclesCount: number;
  primaryVehicle: DashboardPrimaryVehicleDto | null;
  upcomingAppointments: number;
  nextAppointment: DashboardNextAppointmentDto | null;
  pendingAdditionalWork: number;
  openSupportTickets: number;
  unreadNotifications: number;
  activeWarrantyCertificates: number;
  pendingWarrantyClaims: number;
  activeRecalls: number;
  watchlistCount: number;
  pendingOwnershipRequests: number;
  pendingReservations: number;
  pendingQuotations: number;
  pendingTradeIns: number;
  upcomingTestDrives: number;
}

export const dashboardApi = {
  summary: () => apiFetch<DashboardSummaryDto>('/dashboard/summary'),
};
