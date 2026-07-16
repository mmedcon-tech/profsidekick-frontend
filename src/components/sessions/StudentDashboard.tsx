'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';
import { useSubscriberAnalytics } from '@/hooks/useSubscriberAnalytics';
import { Clock, BookOpen } from 'lucide-react';

// ── course card ──────────────────────────────────────────────────────────────

interface CourseCardProps {
  course: ReturnType<typeof useCourses>['courses'][number];
  progress: number;
  lastSessionAt: string | null;
  onClick: () => void;
}

function CourseCard({ course, progress, lastSessionAt, onClick }: CourseCardProps) {
  const tag = course.department || "General";

  let status: string;
  let actionText: string;
  let statusColor: string;
  let statusIcon: React.ReactNode;

  if (progress >= 100) {
    status = "Completed";
    actionText = "Review";
    statusColor = "bg-green-50 text-green-700";
    statusIcon = <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />;
  } else if (progress > 0) {
    status = "In progress";
    actionText = "Resume";
    statusColor = "bg-[#FDF9EB] text-[#A88C4B]";
    statusIcon = <Clock size={10} className="mr-1" />;
  } else {
    status = "Not started";
    actionText = "Start";
    statusColor = "bg-gray-100 text-gray-600";
    statusIcon = <div className="w-2 h-2 rounded-full border border-gray-400 mr-1.5" />;
  }

  const footerLabel = lastSessionAt
    ? `Last session: ${new Date(lastSessionAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : progress === 100 ? "Completed" : "No sessions yet";

  return (
    <button
      onClick={onClick}
      className="group text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 flex flex-col h-full"
    >
      <div className="p-5 flex-1">
        {/* Tags row */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-semibold px-2 py-1 bg-green-50 text-green-700 rounded-md">
            {tag}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-1 rounded-md flex items-center ${statusColor}`}>
            {statusIcon} {status}
          </span>
        </div>

        {/* Title & Desc */}
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-[15px] mb-2 leading-tight line-clamp-2">
          {course.name}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
          {course.description || "Course description not available."}
        </p>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium mb-1.5">
            <span>Overall progress</span>
            <span className="font-bold text-gray-900">{progress}%</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#133221]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 pt-0 mt-auto flex items-end justify-between">
        <span className="text-[11px] text-gray-500">{footerLabel}</span>
        <div className={`${
          progress >= 100
            ? 'bg-[#133221] text-white'
            : progress === 0
            ? 'bg-white border border-gray-300 text-gray-700'
            : 'bg-[#133221] text-white'
        } text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity`}>
          {actionText}
        </div>
      </div>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 shadow-sm animate-pulse h-64" />
  );
}

// ── main dashboard ───────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { courses, loading: loadingCourses, error, refetch } = useCourses();
  const { data: analytics, loading: loadingAnalytics } = useSubscriberAnalytics();

  const isLoading = loadingCourses || loadingAnalytics;

  const displayCourses = useMemo(() => courses, [courses]);

  function getAnalytics(courseId: string) {
    const p = analytics?.course_progress?.find((x) => x.course_id === courseId);
    return {
      progress: p ? Math.round(p.completion_pct) : 0,
      lastSessionAt: p?.last_session_at ?? null,
    };
  }

  return (
    <div className="min-h-full bg-gray-50/50 dark:bg-gray-950">
      <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-6">

        {/* Header subtitle */}
        <div>
          <p className="text-sm text-gray-500 font-medium">
            All courses assigned to you.
          </p>
        </div>

        {/* Course grid */}
        <section>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center bg-white">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Couldn&apos;t load courses
              </p>
              <p className="text-xs text-gray-400 mb-4">{error}</p>
              <button
                onClick={refetch}
                className="text-sm text-primary/90 hover:text-primary/95 font-medium"
              >
                Try again
              </button>
            </div>
          ) : displayCourses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center bg-white">
              <BookOpen size={28} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                No courses yet
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Your instructor will enroll you.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {displayCourses.map((course) => {
                const { progress, lastSessionAt } = getAnalytics(course.course_id);
                return (
                  <CourseCard
                    key={course.course_id}
                    course={course}
                    progress={progress}
                    lastSessionAt={lastSessionAt}
                    onClick={() => router.push(`/courses/${course.course_id}`)}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
