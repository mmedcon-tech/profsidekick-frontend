"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SessionRuns from '@/components/sessions/SessionRuns';
import { config } from '@/lib/config';
import {
  ArrowLeft, BookOpen, Clock, Calendar, Play,
  Loader2, AlertCircle, Bot,
} from 'lucide-react';

interface SessionInfo {
  sessionId: string;
  classDetails: {
    className: string;
    courseName: string;
    courseCode: string;
    courseId?: string;
    duration: number;
  };
  avatarId?: string | null;
  avatarName?: string | null;
  totalSlides: number;
  runCount: number;
  status?: string;
  createdAt?: string;
}

export default function SessionDetailPage() {
  const { courseId, sessionId } = useParams<{ courseId: string; sessionId: string }>();
  const router = useRouter();
  const { user, token } = useAuth();

  const isPublisher = user?.role === 'publisher' || user?.role === 'admin';

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);

  const fetchSession = useCallback(async () => {
    if (!token || !sessionId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(config.getApiUrl('/api/sessions?limit=100'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const found = (data.sessions ?? []).find((s: SessionInfo) => s.sessionId === sessionId);
      if (!found) throw new Error('Session not found');
      setSession(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [token, sessionId]);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  const handleStartRun = async () => {
    if (!token || !sessionId) return;
    setLaunching(true);
    try {
      const res = await fetch(config.getApiUrl(`/api/sessions/${sessionId}/run/start`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || 'Launch failed');
      router.push(`/courses/${courseId}/sessions/${sessionId}/run/${data.sessionRunId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start session');
    } finally {
      setLaunching(false);
    }
  };

  const handleOpenChat = () => {
    router.push(`/publisher/sessions/${sessionId}/chat`);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
          <AlertCircle className="h-6 w-6 shrink-0" />
          <div>
            <p className="font-semibold">Failed to load session</p>
            <p className="text-sm mt-0.5 text-destructive/80">{error}</p>
          </div>
        </div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="mt-1 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1">
            {session.classDetails.courseName} · {session.classDetails.courseCode}
          </p>
          <h1 className="text-2xl font-bold text-foreground truncate">
            {session.classDetails.className}
          </h1>

          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" /> {session.totalSlides} slides
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {session.classDetails.duration} min
            </span>
            <span className="flex items-center gap-1.5">
              <Play className="h-4 w-4" /> {session.runCount} run{session.runCount !== 1 ? 's' : ''}
            </span>
            {session.avatarName && (
              <span className="flex items-center gap-1.5">
                <Bot className="h-4 w-4" /> {session.avatarName}
              </span>
            )}
            {session.createdAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        {isPublisher ? (
          <button
            onClick={handleOpenChat}
            className="shrink-0 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Play className="h-4 w-4" /> Open Chat
          </button>
        ) : (
          <button
            onClick={handleStartRun}
            disabled={launching}
            className="shrink-0 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Join Session
          </button>
        )}
      </div>

      {/* Publisher: runs history */}
      {isPublisher && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-widest">
            Session Runs
          </h2>
          <SessionRuns sessionId={sessionId} courseId={courseId} />
        </div>
      )}
    </div>
  );
}
