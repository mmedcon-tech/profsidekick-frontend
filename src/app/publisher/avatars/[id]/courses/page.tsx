"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { avatarApi, ApiError } from '@/lib/avatarApi';
import type { LinkedCourseLink } from '@/lib/avatarApi';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';
import type { AvatarResponse } from '@/types/avatar';
import type { CourseDetails } from '@/hooks/useCourses';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, Plus, Link2, Unlink, RefreshCw, AlertCircle, CheckCircle2,
} from 'lucide-react';

type LinkedCourse = CourseDetails & { linkId: string };

export default function AvatarCoursesPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  const [avatar, setAvatar] = useState<AvatarResponse | null>(null);
  const [linkedCourses, setLinkedCourses] = useState<LinkedCourse[]>([]);
  const [availableCourses, setAvailableCourses] = useState<CourseDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create & link dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', code: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [av, links, allCourses] = await Promise.all([
        avatarApi.get(id),
        avatarApi.listLinkedCourses(id),
        fetch(config.getApiUrl('/api/courses'), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as Promise<CourseDetails[]>;
        }),
      ]);

      setAvatar(av);

      // Build a set of linked course UUIDs for fast lookup
      const linkedUuids = new Set(links.courses.map((l: LinkedCourseLink) => l.course_id));

      const linked: LinkedCourse[] = [];
      const available: CourseDetails[] = [];

      for (const course of allCourses) {
        if (linkedUuids.has(course.id!)) {
          const linkRecord = links.courses.find((l: LinkedCourseLink) => l.course_id === course.id);
          linked.push({ ...course, linkId: linkRecord!.id });
        } else {
          available.push(course);
        }
      }

      setLinkedCourses(linked);
      setAvailableCourses(available);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleUnlink = async (course: LinkedCourse) => {
    if (!confirm(`Unlink "${course.name}" from this avatar? Existing subscriber enrollments are not removed.`)) return;
    setActionError(null);
    try {
      await avatarApi.unlinkCourse(id, course.id!);
      setLinkedCourses((prev) => prev.filter((c) => c.id !== course.id));
      setAvailableCourses((prev) => [...prev, course]);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Failed to unlink course');
    }
  };

  const handleLink = async (course: CourseDetails) => {
    setActionError(null);
    try {
      const link = await avatarApi.linkCourse(id, course.id!);
      setAvailableCourses((prev) => prev.filter((c) => c.id !== course.id));
      setLinkedCourses((prev) => [...prev, { ...course, linkId: link.id }]);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Failed to link course');
    }
  };

  const handleCreateAndLink = async () => {
    if (!createForm.name.trim()) { setCreateError('Course name is required'); return; }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch(config.getApiUrl('/api/courses'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: createForm.name.trim(),
          code: createForm.code.trim() || undefined,
          description: createForm.description.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || d.message || `HTTP ${res.status}`);
      }
      const newCourse: CourseDetails = await res.json();
      // Link the new course to this avatar
      const link = await avatarApi.linkCourse(id, newCourse.id!);
      setLinkedCourses((prev) => [...prev, { ...newCourse, linkId: link.id }]);
      setCreateForm({ name: '', code: '', description: '' });
      setShowCreate(false);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create course');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 p-6">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Linked Courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Courses linked to <span className="font-medium text-foreground">{avatar?.name}</span>.
            Subscribers who subscribe to this avatar are automatically enrolled in all linked courses.
          </p>
        </div>
        <button onClick={load} className="text-muted-foreground hover:text-foreground mt-1">
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">{error}</p>
            <button onClick={load} className="mt-1 text-xs underline text-destructive">Retry</button>
          </div>
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          <AlertCircle size={14} />
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Linked courses */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-primary" />
            <h2 className="font-semibold text-foreground">Linked Courses</h2>
            <Badge variant="secondary" className="text-xs">{linkedCourses.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => { setShowCreate((v) => !v); setCreateError(null); }}>
              <Plus size={14} className="mr-1" /> Create &amp; Link
            </Button>
          </div>
        </div>

        {/* Inline create form */}
        {showCreate && (
          <div className="border-b border-border bg-muted/30 px-5 py-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">New Course</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. Introduction to Ethics"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Course Code</label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. ETH101"
                  value={createForm.code}
                  onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Description</label>
              <textarea
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                placeholder="Brief course description…"
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            {createError && <p className="text-xs text-destructive">{createError}</p>}
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleCreateAndLink} disabled={creating}>
                {creating ? 'Creating…' : 'Create & Link'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); setCreateError(null); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {linkedCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen size={32} className="text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No courses linked yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Create a new course or link an existing one below.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {linkedCourses.map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-5 py-4">
                <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{c.name || 'Untitled Course'}</p>
                  <p className="text-xs text-muted-foreground">
                    {[c.code, c.department, c.semester].filter(Boolean).join(' · ') || 'No details'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.course_id && (
                    <Link href={`/courses/${c.course_id}`} className="text-xs text-muted-foreground hover:text-foreground underline">
                      Open
                    </Link>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/5"
                    onClick={() => handleUnlink(c)}
                  >
                    <Unlink size={13} /> Unlink
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Available courses to link */}
      {availableCourses.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <Link2 size={16} className="text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Link Existing Course</h2>
            <Badge variant="outline" className="text-xs">{availableCourses.length} available</Badge>
          </div>
          <ul className="divide-y divide-border">
            {availableCourses.map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-5 py-3">
                <div className="h-8 w-8 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                  <BookOpen size={14} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{c.name || 'Untitled Course'}</p>
                  <p className="text-xs text-muted-foreground">
                    {[c.code, c.department].filter(Boolean).join(' · ') || 'No details'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 shrink-0"
                  onClick={() => handleLink(c)}
                >
                  <Link2 size={13} /> Link
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
