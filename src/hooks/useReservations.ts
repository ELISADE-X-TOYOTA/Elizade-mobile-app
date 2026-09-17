import { useCallback, useEffect, useState } from 'react';
import { listReservations, Reservation } from '../data/salesRepository';

/** The customer's reservations, with a `reload` for screens that need it fresh. */
export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    listReservations()
      .then(setReservations)
      .catch((e) => {
        setReservations([]);
        setError(e instanceof Error ? e.message : 'Failed to load reservations');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  return { reservations, loading, error, reload: load };
}
