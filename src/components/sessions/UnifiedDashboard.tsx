"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';
import { BookOpen, Search, Users, Plus, GraduationCap, Globe, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CreateCourseForm {
  name: string;
  code: string;
  section: string;
  description: string;
  department: string;
  semester: string;
  year: string;
  is_public: boolean;
}

const emptyForm = (): CreateCourseForm => ({
  name: '',
  code: '',
  section: '',
  description: '',
  department: '',
  semester: '',
  year: new Date().getFullYear().toString(),
  is_public: false,
});

// ── Course card ───────────────────────────────────────────────────────────────

interface CourseCardProps {
  course: ReturnType<typeof useCourses>['courses'][number];
  onClick: () => void;
}

function CourseCard({ course, onClick }: CourseCardProps) {
  const tag = course.department || 'General';
  const sessionCount = course.session_count || 0;
  const enrollmentCount = course.enrollment_count || 0;

  return (
    <button
      onClick={onClick}
      className="group text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 flex flex-col h-full"
    >
      <div className="p-5 flex-1">
        {/* Tags row */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-semibold px-2 py-1 bg-primary/10 text-primary rounded-md truncate max-w-[120px]">
            {tag}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-1 rounded-md flex items-center gap-1 ${
            course.is_public
              ? 'bg-green-50 text-green-700'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {course.is_public
              ? <><Globe size={9} /> Public</>
              : <><Lock size={9} /> Private</>
            }
          </span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-[15px] mb-1.5 leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {course.name}
        </h3>

        {/* Code / Section */}
        {(course.code || course.section) && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
            {course.code}{course.code && course.section ? ' · ' : ''}{course.section ? `Section ${course.section}` : ''}
          </p>
        )}

        {/* Description */}
        {course.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
            {course.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400 mt-auto">
          <span className="flex items-center gap-1">
            <BookOpen size={11} /> {sessionCount} session{sessionCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Users size={11} /> {enrollmentCount} student{enrollmentCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 pt-0 flex items-center justify-between border-t border-gray-100 dark:border-gray-700 mt-0 pt-3">
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          {course.semester && course.year
            ? `${course.semester} ${course.year}`
            : course.department || ''}
        </span>
        <span className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          Open →
        </span>
      </div>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm animate-pulse h-52" />
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────

export default function UnifiedDashboard({ programId }: { programId?: string } = {}) {
  const router = useRouter();
  const { user } = useAuth();
  const { courses, loading, error, refetch, createCourse } = useCourses(programId);
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateCourseForm>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const filteredCourses = courses.filter(course =>
    course.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCourseClick = (courseId: string) => {
    router.push(`/courses/${courseId}`);
  };

  const set = (patch: Partial<CreateCourseForm>) => setForm(f => ({ ...f, ...patch }));

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    setCreateError(null);
    try {
      await createCourse({
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        section: form.section.trim() || undefined,
        description: form.description.trim() || undefined,
        department: form.department.trim() || undefined,
        semester: form.semester.trim() || undefined,
        year: form.year ? parseInt(form.year, 10) : undefined,
        is_public: form.is_public,
        program_id: programId,
      });
      setCreateOpen(false);
      setForm(emptyForm());
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create course');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-50/50 dark:bg-gray-950">
      <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-6">

        {/* Subtitle + actions row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} in your program
          </p>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search courses…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors w-52"
              />
            </div>
            {/* Create button */}
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              New Course
            </button>
          </div>
        </div>

        {/* Course grid */}
        <section>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center bg-white dark:bg-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Couldn&apos;t load courses
              </p>
              <p className="text-xs text-gray-400 mb-4">{error}</p>
              <button
                onClick={refetch}
                className="text-sm text-primary hover:underline font-medium"
              >
                Try again
              </button>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center bg-white dark:bg-gray-800">
              <GraduationCap size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {searchQuery ? 'No courses match your search' : 'No courses yet'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {searchQuery
                  ? 'Try adjusting your search terms'
                  : 'Create your first course to get started'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setCreateOpen(true)}
                  className="mt-4 text-sm text-primary hover:underline font-medium"
                >
                  Create a course
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.course_id}
                  course={course}
                  onClick={() => handleCourseClick(course.course_id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Create Course Dialog */}
      <Dialog open={createOpen} onOpenChange={open => { if (!open) { setCreateOpen(false); setForm(emptyForm()); setCreateError(null); } }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="c-name">Course Name <span className="text-destructive">*</span></Label>
                <Input
                  id="c-name"
                  required
                  value={form.name}
                  onChange={e => set({ name: e.target.value })}
                  placeholder="e.g. AI Governance & Transformation"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="c-code">Course Code</Label>
                  <Input
                    id="c-code"
                    value={form.code}
                    onChange={e => set({ code: e.target.value })}
                    placeholder="e.g. AIGOV-101"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-section">Section</Label>
                  <Input
                    id="c-section"
                    value={form.section}
                    onChange={e => set({ section: e.target.value })}
                    placeholder="e.g. A"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="c-desc">Description</Label>
                <Textarea
                  id="c-desc"
                  value={form.description}
                  onChange={e => set({ description: e.target.value })}
                  placeholder="Brief description of this course…"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="c-dept">Department</Label>
                  <Input
                    id="c-dept"
                    value={form.department}
                    onChange={e => set({ department: e.target.value })}
                    placeholder="e.g. AI Literacy"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-year">Year</Label>
                  <Input
                    id="c-year"
                    type="number"
                    value={form.year}
                    onChange={e => set({ year: e.target.value })}
                    placeholder={new Date().getFullYear().toString()}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="c-semester">Semester</Label>
                  <Input
                    id="c-semester"
                    value={form.semester}
                    onChange={e => set({ semester: e.target.value })}
                    placeholder="e.g. Fall"
                  />
                </div>
                <div className="flex items-center gap-3 pt-7">
                  <input
                    id="c-public"
                    type="checkbox"
                    checked={form.is_public}
                    onChange={e => set({ is_public: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="c-public" className="cursor-pointer font-normal">
                    Public course
                  </Label>
                </div>
              </div>

              {createError && (
                <p className="text-sm text-destructive">{createError}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setCreateOpen(false); setForm(emptyForm()); setCreateError(null); }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !form.name.trim()}>
                {submitting ? 'Creating…' : 'Create Course'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
