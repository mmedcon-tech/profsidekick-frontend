import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';
import { apiFetch } from '@/lib/api';

export interface CourseProgressSummary {
  course_id: string;
  course_name: string;
  total_sessions: number;
  completed_sessions: number;
  progress_percentage: number;
}

export interface AssessmentSummary {
  session_id: string;
  session_name: string;
  score: number;
  completed_at: string;
}

export interface SubscriberAnalytics {
  user_id: string;
  total_sessions_completed: number;
  total_time_spent_sec: number;
  course_progress: CourseProgressSummary[];
  recent_assessments: AssessmentSummary[];
  average_session_rating?: number;
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
