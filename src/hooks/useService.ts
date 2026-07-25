import { useCallback, useEffect, useState } from 'react';
import {
  fetchAppointments,
  fetchServiceHistory,
  fetchServiceJob,
} from '../data/serviceRepository';
import { ServiceAppointment, ServiceHistoryItem, ServiceJob } from '../domain/types';

export function useAppointments() {
  const [appointments, setAppointments] = useState<ServiceAppointment[]>([]);
  const [history, setHistory] = useState<ServiceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    Promise.all([fetchAppointments(), fetchServiceHistory()])
      .then(([a, h]) => {
        setAppointments(a);
        setHistory(h);
      })
      .catch((e) => setError(e?.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);
  return { appointments, history, loading, error, reload: load };
}

export function useServiceJob(appointmentId: string) {
  const [job, setJob] = useState<ServiceJob | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchServiceJob(appointmentId)
      .then(setJob)
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [appointmentId]);

  useEffect(() => load(), [load]);
  return { job, loading, reload: load, setJob };
}
