import { useCallback, useEffect, useMemo, useState } from 'react';
import { listBranches } from '../api/vehicles';
import { APP } from '../constants/app';
import { SHOWROOMS, Showroom } from '../data/mock';

export type BranchOption = Showroom & { type?: string };

/**
 * Elizade branches (showrooms / service centres).
 *
 * Booking payloads carry a real `branchId`, so these must come from the API —
 * the bundled SHOWROOMS are only a fallback for offline demo mode.
 *
 * Pass `showroomsOnly` for test drives — the backend rejects `service_centre`.
 */
export function useBranches(opts?: { showroomsOnly?: boolean }) {
  const showroomsOnly = opts?.showroomsOnly ?? false;
  const [branches, setBranches] = useState<BranchOption[]>(APP.useMock ? SHOWROOMS : []);
  const [loading, setLoading] = useState(!APP.useMock);

  const load = useCallback(() => {
    if (APP.useMock) return;
    setLoading(true);
    listBranches()
      .then((list) =>
        setBranches(
          list.map((b) => ({
            id: b.id,
            name: b.name,
            city: b.city,
            state: b.state,
            type: b.type,
          })),
        ),
      )
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const filtered = useMemo(() => {
    if (!showroomsOnly) return branches;
    return branches.filter((b) => !b.type || b.type === 'showroom' || b.type === 'both');
  }, [branches, showroomsOnly]);

  return { branches: filtered, loading, reload: load };
}
