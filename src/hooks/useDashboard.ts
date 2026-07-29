import { useCallback, useEffect, useState } from 'react';
import { DashboardSummaryDto } from '../api/dashboard';
import { fetchDashboardSummary } from '../data/dashboardRepository';

/**
 * Home-screen summary. Failures are non-fatal: the panel simply hides rather
 * than blocking the rest of Home, which has its own inventory data.
 */
export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchDashboardSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);
  return { summary, loading, reload: load };
}
