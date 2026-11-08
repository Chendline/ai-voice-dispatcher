import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { WorkspaceBootstrap } from '../types';

type LoadStatus = 'loading' | 'ready' | 'error';

export function useWorkspaceData() {
  const [data, setData] = useState<WorkspaceBootstrap | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const epoch = useRef(0);

  const reload = useCallback(async () => {
    const current = ++epoch.current;
    setRefreshing(true);
    setError(null);
    try {
      const next = await api.workspace();
      if (epoch.current !== current) return;
      setData(next);
      setStatus('ready');
    } catch (loadError) {
      if (epoch.current !== current) return;
      setError(loadError instanceof Error ? loadError.message : 'AEGIS could not reach its API.');
      setStatus(previous => (previous === 'ready' ? 'ready' : 'error'));
    } finally {
      if (epoch.current === current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, status, error, refreshing, reload, setData };
}
