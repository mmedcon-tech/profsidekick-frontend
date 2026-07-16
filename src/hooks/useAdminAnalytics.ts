import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import config from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';

export interface AdminAnalyticsResponse {
  total_users: number;
  total_publishers: number;
  total_subscribers: number;
  total_programs: number;
  total_courses: number;
  total_avatars: number;
  total_session_runs: number;
  total_credits_consumed: number;
  system_health: number;
  active_sessions_today: number;
  monthly_completions: any[];
  course_performance: any[];
  at_risk_learners: any[];
}

export function useAdminAnalytics() {
  const { token, user } = useAuth();
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      if (!token || user?.role !== 'admin') return;
      try {
        setLoading(true);
        const data = await apiFetch<any>(config.getApiUrl('/api/admin/analytics'), { token });
        setData(data);
        if (mounted) {
          setData(data);
        }
      } catch (err) {
        console.error("Error fetching admin analytics:", err);
        if (mounted) setError(err as Error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadStats();
    return () => { mounted = false; };
  }, [token, user]);

  return { data, loading, error };
}
