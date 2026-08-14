import { useCallback, useEffect, useState } from 'react';
import { fetchWatchlist } from '../data/watchlistRepository';
import { WatchlistItem } from '../domain/types';

interface State {
  items: WatchlistItem[];
  loading: boolean;
  error?: string;
}

/** Loads the customer's tracked models, with reload for pull-to-refresh. */
export function useWatchlist() {
  const [state, setState] = useState<State>({ items: [], loading: true });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fetchWatchlist()
      .then((items) => setState({ items, loading: false }))
      .catch((e) =>
        setState({ items: [], loading: false, error: e?.message ?? 'Could not load your watchlist.' }),
      );
  }, []);

  useEffect(() => load(), [load]);

  /** Local mutation so the list responds without a full refetch. */
  const patch = useCallback((item: WatchlistItem) => {
    setState((s) => ({ ...s, items: s.items.map((i) => (i.id === item.id ? item : i)) }));
  }, []);

  const drop = useCallback((id: string) => {
    setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
  }, []);

  const prepend = useCallback((item: WatchlistItem) => {
    setState((s) => ({ ...s, items: [item, ...s.items] }));
  }, []);

  return { ...state, reload: load, patch, drop, prepend };
}
