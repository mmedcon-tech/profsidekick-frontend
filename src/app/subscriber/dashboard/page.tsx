"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { tr } from "@/lib/v2/i18n"
import { useCourses } from "@/hooks/useCourses"
import { useSubscriberAnalytics } from "@/hooks/useSubscriberAnalytics"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  GraduationCap, Clock3, Award, TrendingUp,
  ArrowRight, ArrowLeft, Play, ChevronRight, Info,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700 ${className ?? ""}`} />
  )
}

function StatSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
      <SkeletonBlock className="h-3 w-24" />
      <SkeletonBlock className="h-7 w-16" />
    </div>
  )
}

function CourseCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
      <SkeletonBlock className="h-4 w-3/4" />
      <SkeletonBlock className="h-3 w-1/2" />
      <SkeletonBlock className="h-2 w-full" />
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof Award
  label: string
  value: string
  hint?: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition-shadow hover:shadow-md ${
        accent
          ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      }`}
    >
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
        <Icon className={`h-4 w-4 ${accent ? "text-blue-600 dark:text-blue-400" : ""}`} />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
    </div>
  )
}

// ── Course card ───────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  "in-progress": "text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50",
  "completed":   "text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/50",
  "not-started": "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700",
} as const

function MiniCourseCard({
  course,
  onOpen,
}: {
  course: {
    id: string
    name: { en: string; ar: string }
    department: { en: string; ar: string }
    status: string
    progress: number
    sessions: unknown[]
  }
  onOpen: (id: string) => void
}) {
  const lang = "en" as "en" | "ar"
  const statusKey = (course.status ?? "not-started") as keyof typeof STATUS_STYLES

  return (
    <div
      className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
      onClick={() => onOpen(course.id)}
      role="button"
      tabIndex={0}
      aria-label={`Open ${course.name[lang]}`}
      onKeyDown={(e) => e.key === "Enter" && onOpen(course.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {course.name[lang]}
          </p>
          <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
            {course.department[lang]}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize",
            STATUS_STYLES[statusKey] ?? STATUS_STYLES["not-started"]
          )}
        >
          {statusKey === "in-progress" ? "In Progress" : statusKey === "completed" ? "Completed" : "Not Started"}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>{tr("progress", lang)}</span>
          <span>{course.progress ?? 0}%</span>
        </div>
        <Progress value={course.progress ?? 0} className="h-1.5" />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {course.sessions.length} {tr("sessions", lang)}
        </span>
        <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SubscriberDashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const lang = "en" as "en" | "ar"
  const dir  = "ltr" as "ltr" | "rtl"
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight

  const { data: analytics, loading: loadingAnalytics } = useSubscriberAnalytics()
  const { courses: apiCourses, loading: loadingCourses } = useCourses()

  const isLoading = loadingAnalytics || loadingCourses

  const onOpenCourse = (id: string) => router.push(`/subscriber/courses/${id}`)

  // Map API courses to UI structure — no dummy data
  const visibleCourses = apiCourses.map((c) => {
    const progressData = analytics?.course_progress?.find((p: any) => p.course_id === c.course_id)
    const progress = progressData ? progressData.completion_pct : 0
    let status = "not-started"
    if (progress > 0 && progress < 100) status = "in-progress"
    if (progress === 100) status = "completed"

    return {
      id: c.course_id,
      name:       { en: c.name || "Unknown", ar: c.name || "Unknown" },
      department: { en: c.department || "General", ar: c.department || "General" },
      status,
      progress,
      sessions: [] as unknown[],
    }
  })

  const inProgress = visibleCourses.filter((c) => c.status === "in-progress")
  const completed  = visibleCourses.filter((c) => c.status === "completed")
  const overall    = visibleCourses.length
    ? Math.round(visibleCourses.reduce((s, c) => s + (c.progress ?? 0), 0) / visibleCourses.length)
    : 0

  const totalSessionsCompleted = analytics?.total_sessions_completed ?? 0
  const hoursSpent = Math.round((analytics?.total_time_spent_sec ?? 0) / 3600)
  const recentRuns = analytics?.recent_assessments ?? []

  return (
    <div className="px-4 sm:px-6 py-6 space-y-6 max-w-6xl mx-auto">

      {/* Welcome header */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {tr("welcomeBack", lang)}, {user?.firstName}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          My Learning
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Track your progress and continue where you left off.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              icon={TrendingUp}
              label={tr("overallProgress", lang)}
              value={`${overall}%`}
              accent
            />
            <StatCard
              icon={GraduationCap}
              label={tr("coursesEnrolled", lang)}
              value={`${visibleCourses.length}`}
            />
            <StatCard
              icon={Clock3}
              label={tr("hoursThisMonth", lang)}
              value={hoursSpent > 0 ? `${hoursSpent}h` : "—"}
            />
            <StatCard
              icon={Award}
              label={tr("certificatesEarned", lang)}
              value={`${completed.length}`}
            />
          </>
        )}
      </div>

      {/* Continue learning */}
      {isLoading ? (
        <section>
          <SkeletonBlock className="mb-3 h-4 w-36" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <CourseCardSkeleton key={i} />)}
          </div>
        </section>
      ) : inProgress.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-900 dark:text-gray-100">
              {tr("continueLearning", lang)}
            </h2>
            <button
              onClick={() => router.push("/subscriber/courses")}
              className="flex items-center gap-1 rounded text-xs text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="View all courses"
            >
              {tr("viewAll", lang)} <Arrow className="h-3 w-3" />
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {inProgress.map((c) => (
              <MiniCourseCard key={c.id} course={c} onOpen={onOpenCourse} />
            ))}
          </div>
        </section>
      ) : !isLoading && visibleCourses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <GraduationCap className="mx-auto mb-3 h-6 w-6 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No courses enrolled yet</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Browse the marketplace to get started</p>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => router.push("/subscriber/marketplace")}
          >
            Browse Marketplace <Arrow className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {/* Recent session history */}
      {!isLoading && recentRuns.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-900 dark:text-gray-100">
            {tr("sessionHistory", lang)}
          </h2>
          <div className="space-y-3">
            {recentRuns.map((run: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center gap-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/50">
                  <Play className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {run.session_name}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    {tr("completed", lang)}
                  </p>
                </div>
                {run.score != null && (
                  <span className="shrink-0 rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {run.score}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sessions completed count — only if > 0 */}
      {!isLoading && totalSessionsCompleted > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          {totalSessionsCompleted} sessions completed in total
        </p>
      )}
    </div>
  )
}
