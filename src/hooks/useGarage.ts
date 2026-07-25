import { useCallback, useEffect, useState } from 'react';
import { fetchOwnedVehicle, fetchOwnedVehicles, fetchVehicleRecords } from '../data/garageRepository';
import { OwnedVehicle, ServiceHistoryItem, WarrantyCertificate } from '../domain/types';

export function useOwnedVehicles() {
  const [vehicles, setVehicles] = useState<OwnedVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    fetchOwnedVehicles()
      .then(setVehicles)
      .catch((e) => setError(e?.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);
  return { vehicles, loading, error, reload: load };
}

export function useOwnedVehicle(id: string) {
  const [vehicle, setVehicle] = useState<OwnedVehicle>();
  const [history, setHistory] = useState<ServiceHistoryItem[]>([]);
  const [warranty, setWarranty] = useState<WarrantyCertificate>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([fetchOwnedVehicle(id), fetchVehicleRecords(id)])
      .then(([v, r]) => {
        if (!alive) return;
        setVehicle(v);
        setHistory(r.history);
        setWarranty(r.warranty);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  return { vehicle, history, warranty, loading };
}
