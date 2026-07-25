import { useCallback, useEffect, useState } from 'react';
import { fetchTicket, fetchTickets } from '../data/supportRepository';
import { SupportTicket, TicketMessage } from '../domain/types';

export function useTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    fetchTickets()
      .then(setTickets)
      .catch((e) => setError(e?.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);
  return { tickets, loading, error, reload: load };
}

export function useTicket(id: string) {
  const [ticket, setTicket] = useState<SupportTicket>();
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchTicket(id)
      .then((r) => {
        setTicket(r.ticket);
        setMessages(r.messages);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => load(), [load]);
  return { ticket, messages, loading, reload: load, setMessages, setTicket };
}
