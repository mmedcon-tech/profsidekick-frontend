'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import config from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';
import type { Avatar3DModel } from '@/hooks/useAdminModels';

export function usePublisherModels() {
  const { token } = useAuth();
  const [models, setModels] = useState<Avatar3DModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchModels = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data: any = await apiFetch(config.getApiUrl('/api/publisher/3d-models'), { token });
      setModels(data.models || []);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchModels();
  }, [fetchModels, token]);

  return { models, loading, error };
}
