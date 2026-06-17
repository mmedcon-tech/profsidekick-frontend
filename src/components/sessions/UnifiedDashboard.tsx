"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';
import { BookOpen, Search, Users, Plus, GraduationCap } from 'lucide-react';
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

export default function UnifiedDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { courses, loading, error, refetch, createCourse } = useCourses();
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
      });
      setCreateOpen(false);
      setForm(emptyForm());
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create course');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isPublisher = user?.role === 'publisher' || user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-green-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {isPublisher
              ? 'Manage your courses, sessions, and AI-powered avatars.'
              : 'Browse your subscribed avatars and join interactive learning sessions.'
            }
          </p>
        </div>

        {/* Search and Create Section */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50 transition-colors"
              />
            </div>
          </div>

          {isPublisher && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 bg-primary dark:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 dark:hover:bg-primary focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:ring-offset-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Course
            </button>
          )}
        </div>

        {/* Courses Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isPublisher ? 'Your Courses' : 'Your Subscriptions'}
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse p-6 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-10 h-10 text-red-600" />
              </div>
              <p className="text-red-600 text-lg mb-2">Failed to load courses</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{error}</p>
              <button
                onClick={refetch}
                className="bg-primary dark:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary/90 dark:hover:bg-primary transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {searchQuery
                  ? 'No courses match your search'
                  : isPublisher
                    ? 'No courses created yet'
                    : 'No subscriptions yet'
                }
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                {searchQuery
                  ? 'Try adjusting your search terms'
                  : isPublisher
                    ? 'Create your first course to get started!'
                    : 'Browse the marketplace to subscribe to an avatar!'
                }
              </p>
              {isPublisher && !searchQuery && (
                <button
                  onClick={() => setCreateOpen(true)}
                  className="mt-4 bg-primary dark:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary/90 dark:hover:bg-primary transition-colors"
                >
                  Create Your First Course
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <div
                  key={course.course_id}
                  className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary/30 dark:border-primary hover:bg-primary/5 dark:bg-primary/20 cursor-pointer transition-all duration-200 group"
                  onClick={() => handleCourseClick(course.course_id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg truncate group-hover:text-primary/95 dark:text-primary/30">
                        {course.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {course.code && <span className="font-medium">{course.code}</span>}
                        {course.section && <span>• Section {course.section}</span>}
                      </div>
                      {!isPublisher && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          by {course.owner_name || course.username || 'Unknown'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {course.is_public && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" title="Public course"></div>
                      )}
                      <GraduationCap className="w-5 h-5 text-gray-400 group-hover:text-primary/90 dark:text-primary/40 transition-colors flex-shrink-0" />
                    </div>
                  </div>

                  {course.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {course.description}
                    </p>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <BookOpen className="w-4 h-4" />
                        <span>{course.session_count || 0} sessions</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>{course.enrollment_count || 0} students</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex flex-col">
                        {course.department && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">{course.department}</span>
                        )}
                        {course.semester && course.year && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">{course.semester} {course.year}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Created {formatDate(course.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Getting Started Section */}
        {!loading && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mt-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              {isPublisher ? 'Publishing with ProfSidekick' : 'Learning with MyOS'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {isPublisher ? (
                <>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-primary/10 dark:bg-primary/40 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-primary/90 dark:text-primary/40">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Create Your Course</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Set up your course with details, enroll students, and organize content.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-primary/10 dark:bg-primary/40 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-primary/90 dark:text-primary/40">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Build Teaching Sessions</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Upload presentations and configure AI assistants for interactive lessons.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-primary/10 dark:bg-primary/40 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-primary/90 dark:text-primary/40">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Teach Interactively</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Deliver engaging AI-powered lessons with real-time interaction.</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-green-600">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Access Your Courses</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Browse your enrolled courses and view available learning sessions.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-green-600">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Join Sessions</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Participate in interactive AI-powered learning experiences.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-green-600">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Learn & Engage</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Ask questions and interact with AI tutors during lessons.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
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
