"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';
import type { CourseDetails, CourseSessionSummary, CourseStudent } from '@/hooks/useCourses';
import CourseSettingsTabs from '@/components/courses/CourseSettingsTabs';
import {
  ArrowLeft, BookOpen, Users, Calendar, Clock, Play,
  GraduationCap, Plus, Loader2, AlertCircle, Globe, EyeOff,
  CreditCard, Lock,
} from 'lucide-react';
import { config } from '@/lib/config';
import { toast } from 'sonner';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const { user, token } = useAuth();

  const isPublisher = user?.role === 'publisher' || user?.role === 'admin';

  const { updateCourse, getCourseSessions, getCourseStudents } = useCourses();

  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [sessions, setSessions] = useState<CourseSessionSummary[]>([]);
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [localCourse, setLocalCourse] = useState<Partial<CourseDetails>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Per-session toggling
  const [togglingSession, setTogglingSession] = useState<string | null>(null);
  // Bulk publishing
  const [publishingAll, setPublishingAll] = useState(false);
  // Subscriber eligibility warnings (balance / subscription)
  const [subscriberWarnings, setSubscriberWarnings] = useState<{ code: string; message: string }[]>([]);

  const fetchCourse = useCallback(async () => {
    if (!token || !courseId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || `HTTP ${res.status}`);
      }
      const data: CourseDetails = await res.json();
      setCourse(data);
      setLocalCourse(data);

      const [sess, studs] = await Promise.all([
        getCourseSessions(courseId).catch(() => [] as CourseSessionSummary[]),
        isPublisher ? getCourseStudents(courseId).catch(() => [] as CourseStudent[]) : Promise.resolve([] as CourseStudent[]),
      ]);
      setSessions(sess);
      setStudents(studs);

      // For subscribers: check eligibility on the first published session to surface
      // credit/subscription blockers before they attempt to join.
      if (!isPublisher && sess.length > 0) {
        const firstPublished = sess.find(s => s.is_published) ?? sess[0];
        try {
          const eligRes = await fetch(config.getApiUrl(`/api/sessions/${firstPublished.sessionId}/eligibility`), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (eligRes.ok) {
            const eligData = await eligRes.json();
            if (!eligData.eligible) {
              const blocking = (eligData.issues as { code: string; message: string }[]).filter(
                i => i.code === 'no_credits' || i.code === 'no_subscription',
              );
              setSubscriberWarnings(blocking);
            }
          }
        } catch {
          // Non-fatal: don't block the page if the check fails
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [token, courseId, isPublisher, getCourseSessions, getCourseStudents]);

  useEffect(() => { fetchCourse(); }, [fetchCourse]);

  const handleCourseUpdate = (field: string, value: unknown) => {
    setLocalCourse(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!courseId) return;
    setSaving(true);
    try {
      await updateCourse(courseId, localCourse);
      setHasChanges(false);
      toast.success('Course settings saved');
      await fetchCourse();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSession = () => {
    router.push(`/courses/${courseId}/sessions/new?courseId=${courseId}`);
  };

  const handleRunSession = (sessionId: string) => {
    if (isPublisher) {
      router.push(`/publisher/sessions/${sessionId}/chat`);
    } else {
      router.push(`/sessions/${sessionId}/run?courseId=${courseId}`);
    }
  };

  const patchPublish = async (sessionId: string, is_published: boolean) => {
    const res = await fetch(config.getApiUrl(`/api/sessions/${sessionId}/publish`), {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_published }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || data.message || 'Failed to update');
    }
  };

  const handleToggleSession = async (session: CourseSessionSummary) => {
    setTogglingSession(session.sessionId);
    try {
      await patchPublish(session.sessionId, !session.is_published);
      setSessions(prev =>
        prev.map(s => s.sessionId === session.sessionId ? { ...s, is_published: !s.is_published } : s)
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update publish status');
    } finally {
      setTogglingSession(null);
    }
  };

  const handlePublishAll = async () => {
    const unpublished = sessions.filter(s => !s.is_published);
    if (unpublished.length === 0) return;
    setPublishingAll(true);
    try {
      await Promise.all(unpublished.map(s => patchPublish(s.sessionId, true)));
      setSessions(prev => prev.map(s => ({ ...s, is_published: true })));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Some sessions could not be published');
      await fetchCourse(); // re-sync on partial failure
    } finally {
      setPublishingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
          <AlertCircle className="h-6 w-6 shrink-0" />
          <div>
            <p className="font-semibold">Failed to load course</p>
            <p className="text-sm mt-0.5 text-destructive/80">{error}</p>
          </div>
        </div>
        <button
          onClick={() => router.back()}
          className="mt-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Go back
        </button>
      </div>
    );
  }

  const unpublishedCount = sessions.filter(s => !s.is_published).length;

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
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {course.code && (
              <span className="text-xs font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">
                {course.code}
              </span>
            )}
            {course.section && (
              <span className="text-xs text-muted-foreground">§ {course.section}</span>
            )}
            {course.is_public && (
              <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                Public
              </span>
            )}
            {course.is_active === false && (
              <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                Inactive
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-foreground truncate">{course.name}</h1>

          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
            {course.department && (
              <span className="flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4" /> {course.department}
              </span>
            )}
            {course.semester && course.year && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> {course.semester} {course.year}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" /> {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </span>
            {isPublisher && (
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" /> {students.length} student{students.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {course.description && (
            <p className="mt-3 text-sm text-muted-foreground max-w-2xl">{course.description}</p>
          )}
        </div>

        {isPublisher && (
          <div className="flex items-center gap-2 shrink-0">
            {unpublishedCount > 0 && (
              <button
                onClick={handlePublishAll}
                disabled={publishingAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400 transition-colors disabled:opacity-50"
              >
                {publishingAll ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Globe className="h-3.5 w-3.5" />
                )}
                Publish All ({unpublishedCount})
              </button>
            )}
            <button
              onClick={handleCreateSession}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Session
            </button>
          </div>
        )}
      </div>

      {/* Subscriber eligibility warnings */}
      {!isPublisher && subscriberWarnings.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Action required before joining a session:
          </p>
          {subscriberWarnings.map((w) => (
            <div key={w.code} className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
              {w.code === 'no_credits' ? (
                <CreditCard className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <Lock className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <span className="text-sm">{w.message}</span>
              {w.code === 'no_credits' && (
                <a
                  href="/subscriber/billing"
                  className="ml-auto text-xs font-medium underline shrink-0 hover:text-amber-900 dark:hover:text-amber-200"
                >
                  Redeem code →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sessions */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-widest">
          Sessions
        </h2>

        {sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 py-10 text-center">
            <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              {isPublisher ? 'No sessions yet. Create the first one.' : 'No sessions available yet.'}
            </p>
            {isPublisher && (
              <button
                onClick={handleCreateSession}
                className="mt-3 inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" /> Create Session
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <div
                key={session.sessionId}
                className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-card-foreground truncate">
                      {session.class_name}
                    </p>
                    {session.session_number && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Session #{session.session_number}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRunSession(session.sessionId)}
                    className="shrink-0 flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Play className="h-3 w-3" />
                    {isPublisher ? 'Open' : 'Join'}
                  </button>
                </div>

                {session.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {session.description}
                  </p>
                )}

                <div className="flex gap-3 text-xs text-muted-foreground">
                  {(session.duration ?? 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDuration(session.duration!)}
                    </span>
                  )}
                  {session.total_slides > 0 && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" /> {session.total_slides} slides
                    </span>
                  )}
                  {session.run_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Play className="h-3 w-3" /> {session.run_count} run{session.run_count !== 1 ? 's' : ''}
                    </span>
                  )}
                  {session.session_date && (
                    <span className="flex items-center gap-1 ml-auto">
                      <Calendar className="h-3 w-3" /> {formatDate(session.session_date)}
                    </span>
                  )}
                </div>

                {/* Publisher: publish toggle */}
                {isPublisher && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <button
                      onClick={() => handleToggleSession(session)}
                      disabled={togglingSession === session.sessionId}
                      className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                        session.is_published
                          ? 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-400'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-400'
                      }`}
                    >
                      {togglingSession === session.sessionId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : session.is_published ? (
                        <><Globe className="h-3 w-3" /> Published — click to unpublish</>
                      ) : (
                        <><EyeOff className="h-3 w-3" /> Draft — click to publish</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Publisher: settings tabs */}
      {isPublisher && (
        <CourseSettingsTabs
          courseId={courseId}
          course={localCourse}
          onCourseUpdate={handleCourseUpdate}
          hasChanges={hasChanges}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}
