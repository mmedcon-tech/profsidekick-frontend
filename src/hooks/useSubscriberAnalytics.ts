import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';
import { apiFetch } from '@/lib/api';

export interface CourseProgressSummary {
  course_id: string;
  course_name: string;
  completion_pct: number;
  time_spent_sec: number;
  last_session_at: string | null;
}

export interface AssessmentSummary {
  session_run_id: string;
  score: number | null;
  question_count: number;
  generated_at: string;
}

export interface SubscriberAnalytics {
  user_id: string;
  total_sessions_completed: number;
  total_time_spent_sec: number;
  course_progress: CourseProgressSummary[];
  recent_assessments: AssessmentSummary[];
  average_session_rating?: number | null;
}

export function useSubscriberAnalytics() {
  const { token } = useAuth();
  const [data, setData] = useState<SubscriberAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await apiFetch<SubscriberAnalytics>(
        config.getApiUrl('/api/subscriber/analytics'),
        { token }
      );
      setData(response);
    } catch (err) {
      console.error('useSubscriberAnalytics: failed to load', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, loading, refetch: loadData };
}
