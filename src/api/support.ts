import { SupportTicket, TicketCategory, TicketMessage } from '../domain/types';
import { apiFetch } from './client';

/** Support ticket endpoints — mirror the web support-api. */
export interface CreateTicketBody {
  subject: string;
  category: TicketCategory;
  message: string;
}

export const supportApi = {
  list: () => apiFetch<SupportTicket[]>('/support/tickets'),
  get: (id: string) => apiFetch<{ ticket: SupportTicket; messages: TicketMessage[] }>(`/support/tickets/${id}`),
  create: (body: CreateTicketBody) => apiFetch<SupportTicket>('/support/tickets', { method: 'POST', body }),
  reply: (id: string, body: string) =>
    apiFetch<TicketMessage>(`/support/tickets/${id}/messages`, { method: 'POST', body: { body } }),
  rate: (id: string, rating: number) =>
    apiFetch<SupportTicket>(`/support/tickets/${id}/rating`, { method: 'POST', body: { rating } }),
};
