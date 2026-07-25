import { CreateTicketBody, supportApi } from '../api/support';
import { APP } from '../constants/app';
import { SupportTicket, TicketMessage } from '../domain/types';
import { SUPPORT_TICKETS, TICKET_MESSAGES } from './mock';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let tickets: SupportTicket[] = [...SUPPORT_TICKETS];
const messages: Record<string, TicketMessage[]> = JSON.parse(JSON.stringify(TICKET_MESSAGES));

export async function fetchTickets(): Promise<SupportTicket[]> {
  if (APP.useMock) {
    await delay(400);
    return [...tickets];
  }
  return supportApi.list();
}

export async function fetchTicket(id: string): Promise<{ ticket?: SupportTicket; messages: TicketMessage[] }> {
  if (APP.useMock) {
    await delay(300);
    return { ticket: tickets.find((t) => t.id === id), messages: messages[id] ?? [] };
  }
  return supportApi.get(id);
}

export async function createTicket(body: CreateTicketBody): Promise<SupportTicket> {
  if (APP.useMock) {
    await delay(700);
    const id = `tk${Date.now()}`;
    const iso = new Date().toISOString();
    const ticket: SupportTicket = {
      id,
      reference: `SUP-${Math.floor(1000 + Math.random() * 8999)}`,
      subject: body.subject,
      category: body.category,
      status: 'open',
      createdAt: iso,
      updatedAt: iso,
      lastMessage: body.message,
    };
    tickets = [ticket, ...tickets];
    messages[id] = [
      { id: `m${Date.now()}`, ticketId: id, author: 'customer', authorName: 'You', body: body.message, createdAt: iso },
    ];
    return ticket;
  }
  return supportApi.create(body);
}

export async function replyToTicket(id: string, body: string): Promise<TicketMessage> {
  if (APP.useMock) {
    await delay(300);
    const msg: TicketMessage = {
      id: `m${Date.now()}`,
      ticketId: id,
      author: 'customer',
      authorName: 'You',
      body,
      createdAt: new Date().toISOString(),
    };
    messages[id] = [...(messages[id] ?? []), msg];
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      ticket.lastMessage = body;
      ticket.updatedAt = msg.createdAt;
    }
    return msg;
  }
  return supportApi.reply(id, body);
}

export async function rateTicket(id: string, rating: number): Promise<void> {
  if (APP.useMock) {
    await delay(300);
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) ticket.satisfactionRating = rating;
    return;
  }
  await supportApi.rate(id, rating);
}
