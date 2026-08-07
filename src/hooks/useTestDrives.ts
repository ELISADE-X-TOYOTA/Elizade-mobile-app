import { useCallback, useEffect, useState } from 'react';
import { listTestDrives } from '../data/salesRepository';
import { TestDriveBooking } from '../domain/types';

/**
 * Customer's test-drive bookings from GET /sales/test-drives.
 */
export function useTestDrives() {
  const [bookings, setBookings] = useState<TestDriveBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    listTestDrives()
      .then(setBookings)
      .catch((e) => {
        setBookings([]);
        setError(e instanceof Error ? e.message : 'Failed to load bookings');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { bookings, loading, error, reload: load };
}
