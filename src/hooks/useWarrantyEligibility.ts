import { useEffect, useState } from 'react';
import { checkWarrantyEligibility } from '../data/warrantyRepository';
import { WarrantyEligibility } from '../domain/types';

interface EligibilityState {
  eligibility?: WarrantyEligibility;
  loading: boolean;
  error?: string;
}

export function useWarrantyEligibility(ownedVehicleId: string) {
  const [state, setState] = useState<EligibilityState>({ loading: true });

  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    checkWarrantyEligibility(ownedVehicleId)
      .then((eligibility) => alive && setState({ eligibility, loading: false }))
      .catch((e) => alive && setState({ loading: false, error: e?.message ?? 'Failed to load eligibility' }));
    return () => {
      alive = false;
    };
  }, [ownedVehicleId]);

  return state;
}
