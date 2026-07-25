import { useCallback, useEffect, useState } from 'react';
import { fetchCertificates, fetchClaims, fetchRecalls } from '../data/warrantyRepository';
import { RecallNotice, WarrantyCertificate, WarrantyClaim } from '../domain/types';

export function useWarranty() {
  const [certificates, setCertificates] = useState<WarrantyCertificate[]>([]);
  const [recalls, setRecalls] = useState<RecallNotice[]>([]);
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    Promise.all([fetchCertificates(), fetchRecalls(), fetchClaims()])
      .then(([c, r, cl]) => {
        setCertificates(c);
        setRecalls(r);
        setClaims(cl);
      })
      .catch((e) => setError(e?.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);
  return { certificates, recalls, claims, loading, error, reload: load };
}
