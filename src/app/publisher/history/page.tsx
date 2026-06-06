"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';
import {
  History, Play, Clock, Calendar, Bot, Tag, Layers,
  CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp,
  Loader2, RefreshCw,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

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
}

interface Session {
  sessionId: string;
  classDetails: {
    className: string;
    courseName: string;
    courseCode: string;
    courseId?: string;
    duration: number;
  };
  totalSlides: number;
  runCount: number;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  const cfg: Record<string, { color: string; icon: React.ReactNode }> = {
    COMPLETED: { color: 'bg-green-100 text-green-800', icon: <CheckCircle size={11} /> },
    ACTIVE:    { color: 'bg-blue-100 text-blue-800',   icon: <Play size={11} /> },
    FAILED:    { color: 'bg-red-100 text-red-800',     icon: <XCircle size={11} /> },
  };
  const c = cfg[status] ?? { color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300', icon: <AlertCircle size={11} /> };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>
      {c.icon} {status}
    </span>
  );
}

// ─── Session row ─────────────────────────────────────────────────────────────

function SessionHistoryRow({ session, token }: { session: Session; token: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const [runs, setRuns] = useState<SessionRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsFetched, setRunsFetched] = useState(false);

  const loadRuns = useCallback(async () => {
    if (runsFetched || !token) return;
    setRunsLoading(true);
    try {
      const res = await fetch(config.getApiUrl(`/api/sessions/${session.sessionId}/runs`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRuns(data.runs ?? []);
      setRunsFetched(true);
    } catch { /* non-fatal */ } finally { setRunsLoading(false); }
  }, [session.sessionId, token, runsFetched]);

  const handleToggle = () => {
    if (!expanded) loadRuns();
    setExpanded((p) => !p);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Session header */}
      <button
        onClick={handleToggle}
        className="w-full text-left px-5 py-4 hover:bg-gray-50 dark:bg-gray-900 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm">{session.classDetails.className}</p>
              {session.runCount > 0 && (
                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded">
                  {session.runCount} {session.runCount === 1 ? 'run' : 'runs'}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 truncate">
              {session.classDetails.courseName}
              {session.classDetails.courseCode ? ` · ${session.classDetails.courseCode}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-5 flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
            <div className="text-right hidden sm:block">
              <p className="font-medium text-gray-600 dark:text-gray-400">Created</p>
              <p>{new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
            {session.lastRunAt && (
              <div className="text-right hidden md:block">
                <p className="font-medium text-gray-600 dark:text-gray-400">Last run</p>
                <p>{new Date(session.lastRunAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
            )}
            <div className="text-right">
              <p className="font-medium text-gray-600 dark:text-gray-400">Slides</p>
              <p>{session.totalSlides}</p>
            </div>
            {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
        </div>
      </button>

      {/* Expanded runs */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          {runsLoading && (
            <div className="flex justify-center py-6">
              <Loader2 size={18} className="animate-spin text-gray-400" />
            </div>
          )}
          {!runsLoading && runs.length === 0 && (
            <p className="text-center text-xs text-gray-400 py-6">No runs recorded for this session.</p>
          )}
          {!runsLoading && runs.length > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {runs.map((run) => (
                <div key={run.sessionRunId} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <StatusBadge status={run.status} />
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar size={11} />
                        {formatDate(run.startedAt)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Clock size={11} />
                        {formatDuration(run.duration)}
                      </div>
                      {run.avatarName && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Bot size={11} />
                          {run.avatarName}
                        </div>
                      )}
                      {run.roleAtStart && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Tag size={11} />
                          {run.roleAtStart}
                        </div>
                      )}
                      {run.totalSlides > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Layers size={11} />
                          {run.slidesCompleted ?? '—'}/{run.totalSlides} slides
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">{run.sessionRunId.slice(-8)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PublisherHistoryPage() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const loadSessions = useCallback(async (p: number) => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(
        config.getApiUrl(`/api/sessions?page=${p}&limit=${LIMIT}&sort=updated_desc`),
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      setSessions(data.sessions ?? []);
      setTotal(data.pagination?.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions');
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadSessions(page); }, [loadSessions, page]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <History size={22} className="text-indigo-500" />
            Session History
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            All your teaching sessions and their run records.
          </p>
        </div>
        <button
          onClick={() => loadSessions(page)}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats strip */}
      {total > 0 && (
        <div className="flex gap-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex-1 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{total}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Sessions</p>
          </div>
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
          <button onClick={() => loadSessions(page)} className="mt-3 text-blue-600 text-sm hover:underline">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 p-16 text-center">
          <History size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">No sessions yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Create and run your first session to see it here.
          </p>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((s) => (
            <SessionHistoryRow key={s.sessionId} session={s} token={token} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 pt-2">
          <p>{total} sessions total</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-gray-900 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="px-2 text-xs text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-gray-900 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
