"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { config } from '@/lib/config';
import { Bot, Play, Clock, ArrowLeft, Mic, Info } from 'lucide-react';

interface SessionRecord {
  sessionId: string;
  classDetails: { className: string; courseName: string; courseCode: string; duration: number };
  status: string;
  totalSlides: number;
  runCount: number;
}

function useToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
}

export default function SubscriberProfSidekickPage() {
  const router = useRouter();
  const token = useToken();
  const [sessions,  setSessions]  = useState<SessionRecord[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [launching, setLaunching] = useState<string | null>(null);

  useEffect(() => {
    // Fetch all published sessions (not avatar-scoped, since ProfSidekick
    // represents the pre-avatar sessions in the existing system)
    fetch(config.getApiUrl('/api/sessions?limit=50'), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.ok ? r.json() : { sessions: [] })
      .then((d) => setSessions(d.sessions ?? []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [token]);

  const handleLaunch = async (sessionId: string) => {
    if (!token) { router.push('/login'); return; }
    setLaunching(sessionId);
    try {
      const res = await fetch(config.getApiUrl(`/api/sessions/${sessionId}/run/start`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.detail || 'Launch failed');
      router.push(`/courses/${data.courseId}/sessions/${sessionId}/run/${data.sessionRunId}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to start session');
    } finally {
      setLaunching(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/subscriber/marketplace"
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 w-fit">
        <ArrowLeft size={16} /> Marketplace
      </Link>

      {/* Hero */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
          <Bot size={40} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">ProfSidekick</h1>
        <p className="text-blue-700 text-sm font-medium mt-1">Platform Flagship Avatar</p>
        <p className="text-gray-500 mt-3 text-sm max-w-sm mx-auto">
          AI-powered educational assistant. Covers courses, sessions, oral examinations,
          rubrics, grading, and voice-driven learning.
        </p>
      </div>

      {/* Sessions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Available Sessions</h2>
        <p className="text-sm text-gray-500 mb-4">
          Sessions published by your instructors appear here. Launch one to start learning.
        </p>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
            <Play size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">No sessions available yet.</p>
            <p className="text-gray-400 text-xs mt-1">
              Your instructor hasn&apos;t published any sessions. Check back soon or ask them for a direct session link.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.sessionId}
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-all">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Play size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{s.classDetails.className}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    <span className="flex items-center gap-1"><Clock size={11} />{s.classDetails.duration} min</span>
                    <span>{s.totalSlides} slides</span>
                    <span>{s.runCount} run{s.runCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleLaunch(s.sessionId)}
                  disabled={!!launching}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium flex-shrink-0"
                >
                  {launching === s.sessionId
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Starting…</>
                    : <><Play size={14} /> Launch</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mic note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Mic size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          ProfSidekick sessions are voice-driven AI oral examinations.
          A working microphone is required. You can upload one solution file (PDF, DOCX, TXT)
          per session run for AI review against the grading rubric.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
        <Info size={16} className="text-gray-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600">
          Don&apos;t see a session? Your instructor may share a direct session link with you.
          Ask them for the session URL or check your course materials.
        </p>
      </div>
    </div>
  );
}
