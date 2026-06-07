"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';
import {
  History, Calendar, Clock, AlertCircle,
  Bot, Tag, Layers, Loader2, RefreshCw,
} from 'lucide-react';

interface SessionRun {
  sessionRunId: string;
  sessionId: string;
  status: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  avatarName?: string;
  roleAtStart?: string;
  totalSlides: number;
  slidesCompleted?: number;
  className?: string;
  sessionMode?: string;
}

interface Session {
  sessionId: string;
  classDetails: {
    className: string;
    courseName: string;
    courseCode: string;
    duration: number;
  };
  totalSlides: number;
  runCount: number;
  createdAt: string;
  lastRunAt?: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(minutes?: number) {
  if (!minutes) return 'N/A';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string }> = {
    COMPLETED: { color: 'bg-green-100 text-green-800' },
    ACTIVE:    { color: 'bg-blue-100 text-blue-800' },
    FAILED:    { color: 'bg-red-100 text-red-800' },
  };
  const c = cfg[status] ?? { color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>{status}</span>
  );
}

export default function LearningHistoryPage() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [runs, setRuns] = useState<Record<string, SessionRun[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadSessions = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(
        config.getApiUrl('/api/sessions?page=1&limit=50&sort=updated_desc'),
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      const sessionList: Session[] = data.sessions ?? [];
      setSessions(sessionList);

      // Eagerly load runs for all sessions
      const runMap: Record<string, SessionRun[]> = {};
      await Promise.all(
        sessionList.map(async (s) => {
          try {
            const r = await fetch(
              config.getApiUrl(`/api/sessions/${s.sessionId}/runs`),
              { headers: { Authorization: `Bearer ${token}` } },
            );
            const d = await r.json();
            runMap[s.sessionId] = d.runs ?? [];
          } catch { runMap[s.sessionId] = []; }
        }),
      );
      setRuns(runMap);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load history');
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // Flatten runs across all sessions, sorted by date desc
  const allRuns: (SessionRun & { sessionName: string; courseName: string })[] = sessions
    .flatMap((s) =>
      (runs[s.sessionId] ?? []).map((r) => ({
        ...r,
        sessionName: s.classDetails.className,
        courseName: s.classDetails.courseName,
      }))
    )
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const completedCount = allRuns.filter((r) => r.status === 'COMPLETED').length;
  const totalMinutes = allRuns.reduce((acc, r) => acc + (r.duration ?? 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <History size={22} className="text-indigo-500" />
            Learning History
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your completed avatar sessions and learning activity.</p>
        </div>
        <button
          onClick={loadSessions}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {allRuns.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Sessions', value: allRuns.length },
            { label: 'Completed', value: completedCount },
            { label: 'Total Time', value: formatDuration(totalMinutes) },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-gray-300" />
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-12">
          <AlertCircle size={36} className="mx-auto text-red-400 mb-3" />
          <p className="text-gray-700 dark:text-gray-300 font-medium">{error}</p>
          <button onClick={loadSessions} className="mt-3 text-blue-600 text-sm hover:underline">Try again</button>
        </div>
      )}

      {!loading && !error && allRuns.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 p-16 text-center">
          <History size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">No sessions yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Start a session with an avatar to see your learning history here.
          </p>
        </div>
      )}

      {!loading && !error && allRuns.length > 0 && (
        <div className="space-y-3">
          {allRuns.map((run) => (
            <div key={run.sessionRunId} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{run.sessionName}</p>
                  <p className="text-xs text-gray-400 truncate">{run.courseName}</p>
                </div>
                <StatusBadge status={run.status} />
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar size={11} /> {formatDate(run.startedAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={11} /> {formatDuration(run.duration)}
                </span>
                {run.avatarName && (
                  <span className="flex items-center gap-1">
                    <Bot size={11} /> {run.avatarName}
                  </span>
                )}
                {run.roleAtStart && (
                  <span className="flex items-center gap-1">
                    <Tag size={11} /> {run.roleAtStart}
                  </span>
                )}
                {run.totalSlides > 0 && (
                  <span className="flex items-center gap-1">
                    <Layers size={11} /> {run.slidesCompleted ?? '—'}/{run.totalSlides} slides
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
