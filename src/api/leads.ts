import { apiFetch } from './client';

/**
 * Customer lead tracking — backend `/leads` router.
 *
 * Read-only. Leads are created by the channels that generate them (test
 * drive requests, quote enquiries, showroom visits); the customer follows
 * their progress here but never edits one.
 *
 * These types mirror `app/domains/leads/customer_schemas.py`, which is a
 * deliberate allowlist — the internal deal value, the lost reason and the
 * staff note log are not part of this contract and must not be added here.
 */

/** The four-step customer lifecycle. `closed` shares the last step with
 *  `converted` — they are the two ways the final step can end. */
export type LeadStage =
  | 'submitted'
  | 'under_review'
  | 'in_progress'
  | 'converted'
  | 'closed';

export interface LeadAgentDto {
  firstName: string;
  lastName: string;
}

export interface LeadVehicleDto {
  id: string;
  make: string;
  model: string;
  year: number;
}

export interface LeadTimelineEntryDto {
  /** Null for a representative's note rather than a status change. */
  stage: LeadStage | null;
  title: string;
  body: string | null;
  at: string;
  isNote: boolean;
}

export interface LeadTrackerStepDto {
  stage: LeadStage;
  label: string;
  reached: boolean;
  current: boolean;
}

export interface LeadDto {
  id: string;
  interestedModel: string;
  stage: LeadStage;
  /** Server-rendered English label. The app prefers its own translation and
   *  falls back to this if a stage is ever added server-side first. */
  stageLabel: string;
  stageDescription: string;
  stepIndex: number;
  stepCount: number;
  isTerminal: boolean;
  isConverted: boolean;
  vehicle: LeadVehicleDto | null;
  assignedAgent: LeadAgentDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadDetailDto extends LeadDto {
  tracker: LeadTrackerStepDto[];
  timeline: LeadTimelineEntryDto[];
}

export const leadsApi = {
  list: () => apiFetch<LeadDto[]>('/leads'),
  detail: (leadId: string) => apiFetch<LeadDetailDto>(`/leads/${leadId}`),
};
