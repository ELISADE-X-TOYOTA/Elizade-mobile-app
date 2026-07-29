import { useCallback, useEffect, useState } from 'react';
import { listBranches } from '../api/vehicles';
import { APP } from '../constants/app';
import { SHOWROOMS, Showroom } from '../data/mock';

/**
 * Elizade branches (showrooms / service centres).
 *
 * Booking payloads carry a real `branchId`, so these must come from the API —
 * the bundled SHOWROOMS are only a fallback for offline demo mode.
 */
export function useBranches() {
  const [branches, setBranches] = useState<Showroom[]>(APP.useMock ? SHOWROOMS : []);
  const [loading, setLoading] = useState(!APP.useMock);

  const load = useCallback(() => {
    if (APP.useMock) return;
    setLoading(true);
    listBranches()
      .then((list) =>
        setBranches(
          list.map((b) => ({ id: b.id, name: b.name, city: b.city, state: b.state })),
        ),
      )
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);
  return { branches, loading, reload: load };
}
