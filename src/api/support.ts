import { TicketCategory } from '../domain/types';
import { apiFetch } from './client';
import type { TicketDetailDto, TicketListDto, TicketMessageDto } from './dto';

/** Customer support endpoints — backend `/support` router. */

export interface CreateTicketBody {
  category: TicketCategory;
  subject: string;
  /** Opening message. */
  body: string;
  priority?: string;
}

export const supportApi = {
  list: () => apiFetch<TicketListDto[]>('/support/tickets'),
  get: (id: string) => apiFetch<TicketDetailDto>(`/support/tickets/${id}`),
  create: (body: CreateTicketBody) =>
    apiFetch<TicketDetailDto>('/support/tickets', { method: 'POST', body }),
  reply: (id: string, body: string) =>
    apiFetch<TicketMessageDto>(`/support/tickets/${id}/messages`, { method: 'POST', body: { body } }),
  rate: (id: string, rating: number) =>
    apiFetch<TicketDetailDto>(`/support/tickets/${id}/rate`, { method: 'POST', body: { rating } }),
};
