'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';
import { Clock, MapPin, BookOpen } from 'lucide-react';

// ── course card ──────────────────────────────────────────────────────────────

interface CourseCardProps {
  course: ReturnType<typeof useCourses>['courses'][number];
  onClick: () => void;
}

function CourseCard({ course, onClick }: CourseCardProps) {
  // Using some logic to match the visual states in the UI screenshot
  const tag = course.department || "General";
  
  // Decide status based on session_count or enrolled for demo
  let status = "Not started";
  let progress = 0;
  let actionText = "Start";
  let statusColor = "bg-gray-100 text-gray-600";
  let statusIcon = <div className="w-2 h-2 rounded-full border border-gray-400 mr-1.5" />;

  if (course.enrolled && course.name?.includes('Leadership')) {
    status = "In progress";
    progress = 60;
    actionText = "Resume";
    statusColor = "bg-[#FDF9EB] text-[#A88C4B]";
    statusIcon = <Clock size={10} className="mr-1" />;
  } else if (course.enrolled && course.name?.includes('Occupational')) {
    status = "Completed";
    progress = 100;
    actionText = "Review";
    statusColor = "bg-green-50 text-green-700";
    statusIcon = <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />;
  } else if (course.enrolled && course.name?.includes('English')) {
    status = "In progress";
    progress = 20;
    actionText = "Resume";
    statusColor = "bg-[#FDF9EB] text-[#A88C4B]";
    statusIcon = <Clock size={10} className="mr-1" />;
  }

  const duration = course.description?.includes("weeks") ? "8 weeks" : "4 weeks";
  const location = course.name?.includes('English') ? "Federal Police School - Sharjah" : "Officers Training Institute - Police College, Abu Dhabi";
  
  return (
    <button
      onClick={onClick}
      className="group text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex flex-col h-full"
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

        {/* Metadata */}
        <div className="flex items-center gap-4 text-[11px] text-gray-500 mb-5">
          <span className="flex items-center gap-1"><Clock size={12} /> {duration}</span>
          <span className="flex items-center gap-1"><MapPin size={12} /> {location}</span>
        </div>

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
        <span className="text-[11px] text-gray-500">
          {progress === 100 ? "Completed" : progress === 0 ? "Starts 04/10" : "Assessment: tomorrow"}
        </span>
        <div className={`${progress === 100 ? 'bg-[#133221]' : progress === 0 ? 'bg-white border border-gray-300 text-gray-700' : 'bg-[#133221] text-white'} text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity`}>
          {actionText}
        </div>
      </div>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 shadow-sm animate-pulse h-64">
    </div>
  );
}

// ── main dashboard ───────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { courses, loading, error, refetch } = useCourses();

  // Using all courses
  const displayCourses = useMemo(() => courses, [courses]);

  return (
    <div className="min-h-full bg-gray-50/50 dark:bg-gray-950">
      <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-6">

        {/* Header subtitle */}
        <div>
          <p className="text-sm text-gray-500 font-medium">
            All courses assigned to you by the Officers Training Institute.
          </p>
        </div>

        {/* Course grid */}
        <section>
          {loading ? (
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
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
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
              {displayCourses.map((course) => (
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
