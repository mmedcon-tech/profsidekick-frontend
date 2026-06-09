"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses, CourseDetails, CourseSessionSummary } from '@/hooks/useCourses';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  ArrowLeft,
  BookOpen,
  Users,
  Plus,
  Settings,
  UserPlus,
  Globe,
  Lock,
  Check,
  PlayCircle,
  Clock,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function sessionStatus(session: CourseSessionSummary, index: number, currentIndex: number) {
  if ((session.run_count || 0) > 0) return 'completed' as const;
  if (index === currentIndex) return 'current' as const;
  return 'upcoming' as const;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ── sub-components ────────────────────────────────────────────────────────────

function SessionRow({
  session,
  index,
  status,
  courseId,
}: {
  session: CourseSessionSummary;
  index: number;
  status: 'completed' | 'current' | 'upcoming';
  courseId: string;
}) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/courses/${courseId}/sessions/${session.sessionId}`)}
      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors ${
        status === 'current'
          ? 'border-blue-200 bg-blue-50/60 hover:bg-blue-50'
          : status === 'completed'
          ? 'border-gray-100 bg-white hover:bg-gray-50'
          : 'border-gray-100 bg-white hover:bg-gray-50 opacity-60'
      }`}
    >
      {/* Status icon */}
      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
        status === 'completed'
          ? 'bg-blue-600 border-blue-600'
          : status === 'current'
          ? 'border-blue-600 bg-white'
          : 'border-gray-300 bg-white'
      }`}>
        {status === 'completed' ? (
          <Check size={12} className="text-white" strokeWidth={3} />
        ) : status === 'current' ? (
          <span className="w-2 h-2 rounded-full bg-blue-600" />
        ) : (
          <span className="text-[10px] text-gray-400 font-semibold">{index + 1}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${
          status === 'upcoming' ? 'text-gray-400' : 'text-gray-900'
        }`}>
          {session.class_name}
        </p>
        {session.session_date && (
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <Clock size={10} /> {formatDate(session.session_date)}
          </p>
        )}
      </div>

      {/* Action label */}
      <div className="flex-shrink-0">
        {status === 'current' && (
          <span className="text-xs font-semibold text-blue-600 flex items-center gap-1">
            <PlayCircle size={13} /> Resume
          </span>
        )}
        {status === 'completed' && (
          <span className="text-xs text-gray-400">Review</span>
        )}
      </div>
    </button>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, token } = useAuth();
  const { courses, getCourseSessions } = useCourses();

  const courseId = params.courseId as string;
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [sessions, setSessions] = useState<CourseSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!courseId || !token) { setLoading(false); return; }
      try {
        setLoading(true);
        const found = courses.find((c) => c.course_id === courseId);
        if (found) setCourse(found);
        const s = await getCourseSessions(courseId);
        setSessions(s);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load course');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [courseId, courses, getCourseSessions, token]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !course) {
    return (
      <ProtectedRoute>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft size={15} /> Back
          </button>
          <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <p className="text-sm font-medium text-gray-700 mb-1">{error || 'Course not found'}</p>
            <button onClick={() => router.back()} className="text-sm text-blue-600 hover:text-blue-700 mt-2">Go back</button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const isOwner = course.user_id === user?.id;
  const completedCount = sessions.filter((s) => (s.run_count || 0) > 0).length;
  const progressPct = sessions.length > 0 ? Math.round((completedCount / sessions.length) * 100) : 0;
  const currentIndex = sessions.findIndex((s) => (s.run_count || 0) === 0);
  const nextSession = currentIndex !== -1 ? sessions[currentIndex] : null;

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-5"
        >
          <ArrowLeft size={15} /> Back to courses
        </button>

        <div className="grid grid-cols-3 gap-6">
          {/* ── Left column ─────────────────────────────────────────────── */}
          <div className="col-span-2 space-y-6">
            {/* Course header */}
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {course.department && (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                    {course.department}
                  </span>
                )}
                {course.code && (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                    {course.code}{course.section ? ` · ${course.section}` : ''}
                  </span>
                )}
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                  course.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {course.is_public ? <Globe size={10} /> : <Lock size={10} />}
                  {course.is_public ? 'Public' : 'Private'}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{course.name}</h1>

              {course.description && (
                <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{course.description}</p>
              )}

              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <BookOpen size={12} />
                  {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={12} />
                  {course.enrollment_count ?? 0} enrolled
                </span>
                {course.semester && course.year && (
                  <span>{course.semester} {course.year}</span>
                )}
                {!isOwner && (
                  <span>By {course.owner_name || 'Instructor'}</span>
                )}
              </div>
            </div>

            {/* Progress (subscriber only) */}
            {!isOwner && sessions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700">Overall progress</span>
                  <span className="text-sm font-bold text-blue-600">{progressPct}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Sessions list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Sessions {sessions.length > 0 && `(${completedCount}/${sessions.length})`}
                </h2>
                {isOwner && (
                  <button
                    onClick={() => router.push(`/create?courseId=${courseId}`)}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Plus size={13} /> New session
                  </button>
                )}
              </div>

              {sessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {isOwner ? 'No sessions yet' : 'No sessions available yet'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {isOwner ? 'Create your first session to get started.' : 'Check back later.'}
                  </p>
                  {isOwner && (
                    <button
                      onClick={() => router.push(`/create?courseId=${courseId}`)}
                      className="mt-4 bg-blue-600 text-white text-sm px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Create session
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((s, i) => (
                    <SessionRow
                      key={s.sessionId}
                      session={s}
                      index={i}
                      status={sessionStatus(s, i, currentIndex)}
                      courseId={courseId}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right column ─────────────────────────────────────────────── */}
          <div className="col-span-1 space-y-4">
            {/* Subscriber: Training Assistant card */}
            {!isOwner ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 pt-5 pb-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 ring-2 ring-blue-100">
                    <Image
                      src="/images/avatar-female.png"
                      alt="Training Assistant"
                      fill
                      className="object-cover object-top"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Training Assistant</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                      Online
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed px-5 pb-4">
                  I can guide you through each session, answer questions about the material, and test your understanding.
                </p>

                <div className="px-5 pb-5 space-y-2">
                  {nextSession ? (
                    <button
                      onClick={() => router.push(`/courses/${courseId}/sessions/${nextSession.sessionId}`)}
                      className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      {completedCount > 0 ? 'Resume learning' : 'Start learning'}
                    </button>
                  ) : sessions.length > 0 ? (
                    <button
                      onClick={() => router.push(`/courses/${courseId}/sessions/${sessions[0].sessionId}`)}
                      className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Review course
                    </button>
                  ) : null}
                  <button
                    onClick={() => {/* FloatingAvatar is already on the page */}}
                    className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Ask assistant
                  </button>
                </div>
              </div>
            ) : (
              /* Owner: Quick actions + stats */
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Actions</h3>
                <button
                  onClick={() => router.push(`/create?courseId=${courseId}`)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Plus size={14} /> Create Session
                </button>
                <button
                  onClick={() => router.push(`/courses/${courseId}/students`)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
                >
                  <UserPlus size={14} /> Manage Students
                </button>
                <button
                  onClick={() => router.push(`/courses/${courseId}/settings`)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
                >
                  <Settings size={14} /> Course Settings
                </button>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
                  {[
                    { value: sessions.length, label: 'Sessions' },
                    { value: course.enrollment_count ?? 0, label: 'Students' },
                    { value: sessions.reduce((t, s) => t + (s.run_count || 0), 0), label: 'Runs' },
                  ].map(({ value, label }) => (
                    <div key={label} className="text-center">
                      <p className="text-lg font-bold text-gray-900">{value}</p>
                      <p className="text-[11px] text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Learning objectives / course info */}
            {course.description && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                  About this course
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">{course.description}</p>
                {course.semester && course.year && (
                  <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
                    <BookOpen size={11} /> {course.semester} {course.year}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
