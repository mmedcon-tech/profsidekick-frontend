"use client";

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';
import { useSubscriberStats } from '@/hooks/useSubscriberStats';
import { ArrowRight, MapPin, Clock, Circle, TrendingUp, BookOpen, Award } from 'lucide-react';
import Image from 'next/image';

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-gray-400">{icon}</span>
        <span className="text-sm text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}

// ── Continue-learning card ────────────────────────────────────────────────────

function ContinueCard({
  course,
  onOpen,
}: {
  course: ReturnType<typeof useCourses>['courses'][number];
  onOpen: () => void;
}) {
  // Using some mock data for UI visual matching since exact fields like tag, location might not be on 'course'
  const tag = course.department || "General";
  const status = course.enrolled ? "In progress" : "Not started";
  const duration = course.description?.includes("weeks") ? "8 weeks" : "4 weeks";
  const location = "Online";
  const progress = course.enrolled ? 60 : 0;
  
  return (
    <button
      onClick={onOpen}
      className="group text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex flex-col h-full"
    >
      <div className="p-5 flex-1">
        {/* Tags row */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-semibold px-2 py-1 bg-green-50 text-green-700 rounded-md">
            {tag}
          </span>
          <span className="text-[10px] font-semibold px-2 py-1 bg-[#FDF9EB] text-[#A88C4B] rounded-md flex items-center gap-1">
            <Clock size={10} /> {status}
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
          Due in 9 days
        </span>
        <div className="bg-[#133221] text-white text-xs font-semibold px-4 py-2 rounded-lg group-hover:bg-[#1A452D] transition-colors">
          Resume
        </div>
      </div>
    </button>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonTile() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 p-5 shadow-sm animate-pulse h-32">
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 shadow-sm animate-pulse h-64">
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SubscriberDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { courses, loading: coursesLoading } = useCourses();
  const { stats, loading: statsLoading } = useSubscriberStats(courses.length);

  const loading = coursesLoading || statsLoading;

  // Show enrolled courses (the endpoint returns enrolled courses)
  const dashboardCourses = useMemo(
    () => courses.slice(0, 3),
    [courses],
  );

  return (
    <div className="min-h-full bg-gray-50/50 dark:bg-gray-950">
      <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-6">

        {/* ── Welcome banner ──────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-[#F9F7F2] to-white border border-[#EBE6DA] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-sm">
          <div className="flex items-center gap-5 z-10">
            {/* Avatar illustration */}
            <div className="relative w-16 h-16 rounded-full border-4 border-white shadow-md bg-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
               <span className="text-xl font-bold text-gray-500">
                  {(user?.firstName?.[0] || 'U').toUpperCase()}
               </span>
               <div className="absolute -bottom-1 -translate-x-1/2 left-1/2 flex gap-0.5">
                 <div className="w-1 h-2 bg-[#BA984E] rounded-full"></div>
                 <div className="w-1 h-3 bg-[#BA984E] rounded-full"></div>
                 <div className="w-1 h-2 bg-[#BA984E] rounded-full"></div>
               </div>
            </div>
            
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-1">
                WELCOME BACK, {user?.firstName ? `${user.firstName} ${user.lastName}` : 'USER'}
              </p>
              <p className="text-[15px] text-gray-900 font-medium max-w-2xl">
                I see you&apos;ve completed 60% of the Basic Leadership course. Would you like a quick revision before tomorrow&apos;s assessment?
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push('/subscriber/courses')}
            className="z-10 bg-[#133221] hover:bg-[#1A452D] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 flex-shrink-0"
          >
            Continue learning <ArrowRight size={14} />
          </button>
        </div>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonTile key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile
              label="Overall progress"
              value={`${stats?.overallProgressPct ?? 36}%`}
              icon={<TrendingUp size={16} />}
            />
            <StatTile
              label="Courses enrolled"
              value={stats?.coursesEnrolled ?? (courses.length > 0 ? courses.length : 6)}
              icon={<BookOpen size={16} />}
            />
            <StatTile
              label="Hours this month"
              value={stats ? (stats.totalRunMinutes / 60).toFixed(1) : '18.5'}
              icon={<Clock size={16} />}
            />
            <StatTile
              label="Certificates earned"
              value={'1'}
              icon={<Award size={16} />}
            />
          </div>
        )}

        {/* ── Continue Learning ────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4 mt-2">
            <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
              CONTINUE LEARNING
            </h2>
          </div>

          {coursesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : dashboardCourses.length === 0 ? (
             <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-10 text-center bg-white">
              <BookOpen size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                No courses assigned yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {dashboardCourses.map((c) => (
                <ContinueCard
                  key={c.course_id}
                  course={c}
                  onOpen={() => router.push(`/courses/${c.course_id}`)}
                />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
