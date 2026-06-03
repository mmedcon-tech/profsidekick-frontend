"use client";

/**
 * Courses & Sessions page — scoped to a specific avatar.
 *
 * This is the gateway from the Avatar layer into the ProfSidekick
 * Course → Session → Session Run workflow.
 *
 * - Sessions shown here have avatar_id = this avatar
 * - New sessions created from this page pre-fill avatar_id
 * - Courses shown here belong to the publisher (all courses, since
 *   courses are not scoped to a single avatar by the current schema)
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { config } from '@/lib/config';
import { avatarApi } from '@/lib/avatarApi';
import type { AvatarResponse } from '@/types/avatar';
import {
  ArrowLeft, BookOpen, Plus, Calendar, Play,
  ExternalLink, RefreshCw, AlertCircle,
} from 'lucide-react';

interface CourseRecord {
  course_id: string;
  name?: string;
  code?: string;
  department?: string;
  description?: string;
  session_count?: number;
  created_at: string;
}

interface SessionRecord {
  sessionId: string;
  classDetails: { className: string; courseName: string; courseCode: string; courseId?: string; duration: number };
  status: string;
  totalSlides: number;
  runCount: number;
  createdAt: string;
  lastRunAt?: string;
}

function useToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
}

async function apiFetch<T>(url: string, token: string | null): Promise<T> {
  const r = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.message || d.detail || `HTTP ${r.status}`);
  }
  return r.json();
}

export default function AvatarCoursesPage() {
  const { id } = useParams<{ id: string }>();
  const token = useToken();

  const [avatar,   setAvatar]   = useState<AvatarResponse | null>(null);
  const [courses,  setCourses]  = useState<CourseRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [av, coursesData, sessionsData] = await Promise.all([
        avatarApi.get(id),
        apiFetch<CourseRecord[]>(config.getApiUrl('/api/courses'), token),
        apiFetch<{ sessions: SessionRecord[] }>(
          config.getApiUrl(`/api/sessions?avatar_id=${id}&limit=50`), token
        ),
      ]);
      setAvatar(av);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
      setSessions(sessionsData.sessions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/publisher/avatars" className="hover:text-gray-700">Avatars</Link>
        <span>/</span>
        <Link href={`/publisher/avatars/${id}`} className="hover:text-gray-700">
          {avatar?.name ?? 'Avatar'}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Courses &amp; Sessions</span>
      </div>

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses &amp; Sessions</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Manage the teaching workflow for <span className="font-medium text-blue-700">{avatar?.name}</span>.
            Sessions created here are linked to this avatar — subscribers who launch this avatar
            run these sessions.
          </p>
        </div>
        <button onClick={load} className="text-gray-400 hover:text-gray-600 mt-1">
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700 font-medium">Error loading data</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
            <button onClick={load} className="text-xs text-red-700 underline mt-1">Retry</button>
          </div>
        </div>
      )}

      {/* ── Sessions linked to this avatar ──────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Sessions using this Avatar</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              These sessions already have <code className="bg-gray-100 px-1 rounded">avatar_id</code> set to this avatar.
              When a subscriber launches this avatar, one of these sessions runs.
            </p>
          </div>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <Calendar size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">No sessions linked to this avatar yet.</p>
            <p className="text-gray-400 text-xs mt-1 mb-4">
              Create a session inside one of your courses and select this avatar during setup.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus size={14} /> Create Session in Course Manager
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sessions.map((s) => (
              <div key={s.sessionId} className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Play size={14} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{s.classDetails.className}</p>
                  <p className="text-xs text-gray-400">
                    {s.classDetails.courseName} · {s.runCount} run{s.runCount !== 1 ? 's' : ''} · {s.totalSlides} slides
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    s.runCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {s.runCount > 0 ? 'Used' : 'Draft'}
                  </span>
                  <Link
                    href={`/courses/${s.classDetails.courseId || s.classDetails.courseCode}/sessions/${s.sessionId}`}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    Open <ExternalLink size={11} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── All publisher courses (entry point to create linked sessions) ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Your Courses</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Open a course to create sessions that use <span className="font-medium">{avatar?.name}</span> as their AI avatar.
            </p>
          </div>
          <Link href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <ExternalLink size={13} /> Full Course Manager
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <BookOpen size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">No courses yet.</p>
            <Link href="/dashboard"
              className="mt-3 inline-flex items-center gap-1.5 text-blue-600 text-sm hover:underline">
              <Plus size={13} /> Create your first course
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {courses.map((c) => (
              <Link
                key={c.course_id}
                href={`/courses/${c.course_id}`}
                className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={14} className="text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm group-hover:text-blue-700 truncate">
                      {c.name || 'Untitled Course'}
                    </p>
                    {c.code && <p className="text-xs text-gray-400">{c.code}</p>}
                    {c.department && <p className="text-xs text-gray-400">{c.department}</p>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* How-to guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800 space-y-2">
        <p className="font-semibold">How to link a session to this avatar</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-700">
          <li>Open a course above (or create a new one).</li>
          <li>Create a new session inside the course.</li>
          <li>In the session creation form, select <strong>{avatar?.name}</strong> as the avatar.</li>
          <li>That session will appear in the list above and run when subscribers launch this avatar.</li>
        </ol>
      </div>
    </div>
  );
}
