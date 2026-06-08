'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';
import { useSubscriberStats } from '@/hooks/useSubscriberStats';
import { BookOpen, Search, Users, GraduationCap, Clock, TrendingUp, ArrowRight } from 'lucide-react';

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string | number;
  loading?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 text-center">
      {loading ? (
        <>
          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mb-1" />
          <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mx-auto" />
        </>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
        </>
      )}
    </div>
  );
}

function formatHours(minutes: number) {
  const h = (minutes / 60).toFixed(1);
  return h;
}

export default function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const { courses, loading, error, refetch } = useCourses();
  const { stats, loading: statsLoading } = useSubscriberStats(courses.length);

  const filteredCourses = useMemo(() => {
    if (!searchQuery) return courses;
    const q = searchQuery.toLowerCase();
    return courses.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q) ||
        c.department?.toLowerCase().includes(q),
    );
  }, [courses, searchQuery]);

  const handleViewCourse = (courseId: string) => {
    router.push(`/courses/${courseId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const firstName = user?.firstName || user?.username || 'there';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Here&apos;s an overview of your learning progress.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Overall Progress"
            value={stats ? `${stats.overallProgressPct}%` : '—'}
            loading={statsLoading}
          />
          <StatCard
            label="Courses Enrolled"
            value={loading ? '—' : courses.length}
            loading={loading}
          />
          <StatCard
            label="Hours Spent"
            value={stats ? formatHours(stats.totalRunMinutes) : '—'}
            loading={statsLoading}
          />
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search courses…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 input-style rounded-xl text-sm"
          />
        </div>

        {/* Continue Learning */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-500" />
            Continue Learning
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5"
                >
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-10 text-center">
              <GraduationCap className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-500 font-medium mb-2">Failed to load courses</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{error}</p>
              <button
                onClick={refetch}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center">
              <GraduationCap className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                {searchQuery ? 'No courses match your search' : 'No courses enrolled yet'}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery
                  ? 'Try different keywords'
                  : 'Contact your instructor to get enrolled.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.map((course) => (
                <div
                  key={course.course_id}
                  onClick={() => handleViewCourse(course.course_id)}
                  className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl p-5 cursor-pointer transition-all duration-150 hover:shadow-md"
                >
                  {/* Top row: name + status badge */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 transition-colors">
                      {course.name}
                    </h4>
                    {(course.session_count ?? 0) > 0 ? (
                      <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        In Progress
                      </span>
                    ) : (
                      <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        Not Started
                      </span>
                    )}
                  </div>

                  {/* Code + section */}
                  {course.code && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {course.code}{course.section ? ` · ${course.section}` : ''}
                    </p>
                  )}

                  {/* Instructor */}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                    by {course.owner_name}
                  </p>

                  {/* Description */}
                  {course.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                      {course.description}
                    </p>
                  )}

                  {/* Footer stats */}
                  <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <BookOpen size={11} />
                        {course.session_count ?? 0} sessions
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={11} />
                        {course.enrollment_count ?? 0}
                      </span>
                    </div>
                    <ArrowRight
                      size={14}
                      className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all"
                    />
                  </div>

                  {/* Department / date */}
                  {(course.department || course.semester) && (
                    <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                      {course.department && <span>{course.department}</span>}
                      {course.semester && course.year && (
                        <span>{course.semester} {course.year}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick guide — only shown when courses exist */}
        {!loading && !error && courses.length > 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-gray-400" />
              How to access a session
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  step: '1',
                  title: 'Select a course',
                  desc: 'Click any course card above to view its sessions.',
                },
                {
                  step: '2',
                  title: 'Choose a session',
                  desc: 'Browse sessions created by your instructor.',
                },
                {
                  step: '3',
                  title: 'Start learning',
                  desc: 'Launch an AI-powered interactive session.',
                },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {item.step}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
