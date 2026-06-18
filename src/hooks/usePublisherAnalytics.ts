import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import config from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';

export interface PublisherAnalyticsResponse {
  total_subscribers: number;
  total_courses: number;
  total_sessions: number;
  total_avatars: number;
  // We can add departmentStats, monthlyCompletion, etc. if backend supports it later
  // For now, we mock the chart data but use the real high-level stats
}

export function usePublisherAnalytics(programId?: string) {
  const { token, user } = useAuth();
  const [data, setData] = useState<PublisherAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      if (!token || user?.role !== 'publisher') return;
      try {
        setLoading(true);
        const endpoint = programId
          ? `/api/publisher/analytics?program_id=${programId}`
          : '/api/publisher/analytics';
        const data = await apiFetch<any>(config.getApiUrl(endpoint), { token });
        if (mounted) setData(data);
      } catch (err) {
        console.error("Error fetching publisher analytics:", err);
        if (mounted) setError(err as Error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadStats();
    return () => { mounted = false; };
  }, [token, user, programId]);

  return { data, loading, error };
}
