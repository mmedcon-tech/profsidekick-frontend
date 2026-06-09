import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';

export interface SubscriberStats {
  coursesEnrolled: number;
  completedRuns: number;
  totalRunMinutes: number;
  overallProgressPct: number; // % of sessions with at least one completed run
}

export function useSubscriberStats(coursesEnrolled: number) {
  const { token } = useAuth();
  const [stats, setStats] = useState<SubscriberStats | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    try {
      const sessionsRes = await fetch(
        config.getApiUrl('/api/sessions?page=1&limit=100'),
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const sessionsData = await sessionsRes.json();
      const sessions: Array<{ sessionId: string }> = sessionsData.sessions ?? [];

      // Fetch runs for every session in parallel
      const perSession = await Promise.all(
        sessions.map(async (s) => {
          try {
            const r = await fetch(
              config.getApiUrl(`/api/sessions/${s.sessionId}/runs`),
              { headers: { Authorization: `Bearer ${token}` } },
            );
            const d = await r.json();
            const runs: Array<{ status: string; duration?: number }> = d.runs ?? [];
            return { sessionId: s.sessionId, runs };
          } catch {
            return { sessionId: s.sessionId, runs: [] };
          }
        }),
      );

      const allRuns = perSession.flatMap((s) => s.runs);
      const completedRuns = allRuns.filter((r) => r.status === 'COMPLETED');
      const totalRunMinutes = allRuns.reduce((sum, r) => sum + (r.duration ?? 0), 0);
      const sessionsWithCompletedRun = perSession.filter((s) =>
        s.runs.some((r) => r.status === 'COMPLETED'),
      ).length;
      const overallProgressPct =
        sessions.length > 0
          ? Math.round((sessionsWithCompletedRun / sessions.length) * 100)
          : 0;

      setStats({
        coursesEnrolled,
        completedRuns: completedRuns.length,
        totalRunMinutes,
        overallProgressPct,
      });
    } catch (err) {
      console.error('useSubscriberStats: failed to load', err);
    } finally {
      setLoading(false);
    }
  }, [token, coursesEnrolled]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { stats, loading, refetch: loadStats };
}
