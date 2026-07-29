import { useCallback, useEffect, useState } from 'react';
import { fetchVehicle, fetchVehicles, VehicleQuery } from '../data/vehicleRepository';
import { Vehicle } from '../domain/types';

interface ListState {
  vehicles: Vehicle[];
  loading: boolean;
  error?: string;
}

/**
 * Loads the vehicle list with loading/error state and pull-to-refresh.
 *
 * `query` maps to real `/vehicles` parameters. It's serialised into the effect
 * key so changing a filter re-queries the backend, and an unchanged object
 * identity (a new `{}` each render) doesn't cause a refetch loop.
 */
export function useVehicles(query: VehicleQuery = {}) {
  const [state, setState] = useState<ListState>({ vehicles: [], loading: true });
  const key = JSON.stringify(query);

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fetchVehicles(JSON.parse(key) as VehicleQuery)
      .then((vehicles) => setState({ vehicles, loading: false }))
      .catch((e) => setState({ vehicles: [], loading: false, error: e?.message ?? 'Failed to load' }));
  }, [key]);

  useEffect(() => load(), [load]);
  return { ...state, reload: load };
}

interface DetailState {
  vehicle?: Vehicle;
  loading: boolean;
  error?: string;
}

/** Loads a single vehicle's detail. */
export function useVehicle(id: string) {
  const [state, setState] = useState<DetailState>({ loading: true });

  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    fetchVehicle(id)
      .then((vehicle) => alive && setState({ vehicle, loading: false }))
      .catch((e) => alive && setState({ loading: false, error: e?.message ?? 'Failed to load' }));
    return () => {
      alive = false;
    };
  }, [id]);

  return state;
}
