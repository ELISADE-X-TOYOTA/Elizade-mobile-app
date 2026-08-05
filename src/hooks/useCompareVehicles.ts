import { useCallback, useEffect, useState } from 'react';
import { fetchVehicle } from '../data/vehicleRepository';
import { Vehicle } from '../domain/types';

interface State {
  vehicles: Vehicle[];
  loading: boolean;
  error?: string;
}

/**
 * Loads FULL detail for every staged vehicle, in parallel.
 *
 * The compare tray only holds list-level snapshots, and `GET /vehicles` omits
 * `engine` and the whole `specs` bag — so comparing what the cards already had
 * would produce a matrix of blanks. Each id is re-fetched through
 * `GET /vehicles/{id}`, which is the endpoint that carries specs.
 *
 * One failing id fails the comparison rather than rendering a half-populated
 * matrix: a spec table silently missing one car's data reads as "this vehicle
 * lacks these features", which is worse than an honest error.
 */
export function useCompareVehicles(ids: string[]) {
  const [state, setState] = useState<State>({ vehicles: [], loading: ids.length > 0 });
  // Serialised so a fresh array identity each render doesn't refetch forever.
  const key = ids.join(',');

  const load = useCallback(() => {
    const list = key ? key.split(',') : [];
    if (!list.length) {
      setState({ vehicles: [], loading: false });
      return () => {};
    }
    let alive = true;
    setState({ vehicles: [], loading: true });
    Promise.all(list.map((id) => fetchVehicle(id)))
      .then((vehicles) => alive && setState({ vehicles, loading: false }))
      .catch(
        (e) =>
          alive &&
          setState({
            vehicles: [],
            loading: false,
            error: e?.message ?? 'Could not load these vehicles.',
          }),
      );
    return () => {
      alive = false;
    };
  }, [key]);

  useEffect(() => load(), [load]);
  return { ...state, reload: load };
}
