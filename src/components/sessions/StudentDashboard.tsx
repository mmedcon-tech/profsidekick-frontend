'use client';

import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSearch } from '@/contexts/SearchContext';
import { useCourses } from '@/hooks/useCourses';
import { useSubscriberStats } from '@/hooks/useSubscriberStats';
import { BookOpen, Users, ArrowUpRight, Clock } from 'lucide-react';

// Derives a stable accent color from a string — no random, no AI imagery
const CARD_ACCENTS = [
  { bg: 'bg-blue-600',   text: 'text-white' },
  { bg: 'bg-slate-700',  text: 'text-white' },
  { bg: 'bg-indigo-600', text: 'text-white' },
  { bg: 'bg-teal-700',   text: 'text-white' },
  { bg: 'bg-violet-700', text: 'text-white' },
  { bg: 'bg-cyan-700',   text: 'text-white' },
];

function courseAccent(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return CARD_ACCENTS[hash % CARD_ACCENTS.length];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function formatHours(minutes: number) {
  return (minutes / 60).toFixed(1);
}

// ── skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm animate-pulse">
      <div className="h-24 bg-gray-200 dark:bg-gray-700" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
        <div className="h-px bg-gray-100 dark:bg-gray-700 my-3" />
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-2/3" />
      </div>
    </div>
  );
}

// ── course card ──────────────────────────────────────────────────────────────

interface CourseCardProps {
  course: ReturnType<typeof useCourses>['courses'][number];
  onClick: () => void;
}

function CourseCard({ course, onClick }: CourseCardProps) {
  const accent = courseAccent(course.name ?? '');
  const hasSession = (course.session_count ?? 0) > 0;

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {/* Colored header */}
      <div className={`${accent.bg} px-5 pt-5 pb-4 flex items-start justify-between`}>
        <div className={`text-2xl font-bold tracking-tight ${accent.text} leading-none`}>
          {initials(course.name ?? '?')}
        </div>
        <div className="flex items-center gap-2">
          {hasSession ? (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white">
              In progress
            </span>
          ) : (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-black/20 text-white/80">
              Not started
            </span>
          )}
          <ArrowUpRight
            size={15}
            className="text-white/60 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150"
          />
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug line-clamp-2 mb-0.5">
          {course.name}
        </h3>
        {course.code && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            {course.code}{course.section ? ` · ${course.section}` : ''}
            {course.department ? ` · ${course.department}` : ''}
          </p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2 min-h-[2.5rem]">
          {course.description || `Taught by ${course.owner_name}`}
        </p>

        <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 pt-3 border-t border-gray-100 dark:border-gray-700">
          <span className="flex items-center gap-1.5">
            <BookOpen size={11} />
            {course.session_count ?? 0} session{(course.session_count ?? 0) !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={11} />
            {course.enrollment_count ?? 0} enrolled
          </span>
          {course.semester && course.year && (
            <span className="flex items-center gap-1.5 ml-auto">
              <Clock size={11} />
              {course.semester} {course.year}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── main dashboard ───────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { query: searchQuery, register, unregister } = useSearch();

  const { courses, loading, error, refetch } = useCourses();
  const { stats } = useSubscriberStats(courses.length);

  useEffect(() => {
    register('Search courses, instructors…', () => {});
    return () => unregister();
  }, [register, unregister]);

  const filteredCourses = useMemo(() => {
    if (!searchQuery) return courses;
    const q = searchQuery.toLowerCase();
    return courses.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q) ||
        c.department?.toLowerCase().includes(q) ||
        c.owner_name?.toLowerCase().includes(q),
    );
  }, [courses, searchQuery]);

  const firstName = user?.firstName || user?.username || '';

  return (
    <div className="min-h-full bg-white dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10 space-y-8">

        {/* Greeting + inline stats */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
            Welcome back{firstName ? `, ${firstName}` : ''}
          </p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            What would you like to learn today?
          </h1>

          {/* Subtle inline stats — not hero metrics */}
          {stats && (
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
              {stats.coursesEnrolled} course{stats.coursesEnrolled !== 1 ? 's' : ''} enrolled
              {stats.completedRuns > 0 && (
                <>
                  {' · '}
                  {stats.completedRuns} session{stats.completedRuns !== 1 ? 's' : ''} completed
                  {' · '}
                  {formatHours(stats.totalRunMinutes)} hours
                </>
              )}
            </p>
          )}
        </div>

        {/* Course grid */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-widest">
              {searchQuery ? 'Results' : 'Your Courses'}
            </h2>
            {!loading && !error && (
              <span className="text-xs text-gray-400">
                {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Couldn&apos;t load courses
              </p>
              <p className="text-xs text-gray-400 mb-4">{error}</p>
              <button
                onClick={refetch}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Try again
              </button>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {searchQuery ? 'No courses match your search' : 'No courses yet'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {searchQuery ? 'Try different keywords' : 'Your instructor will enroll you.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.course_id}
                  course={course}
                  onClick={() => router.push(`/courses/${course.course_id}`)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
