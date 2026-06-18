"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { tr } from "@/lib/v2/i18n"
import { useCourses } from "@/hooks/useCourses"
import { useSubscriberAnalytics } from "@/hooks/useSubscriberAnalytics"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { GraduationCap, Clock3, Award, TrendingUp, ArrowRight, ArrowLeft, Play, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

function StatCard({ icon: Icon, label, value, hint }: { icon: typeof Award; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function MiniCourseCard({ course, onOpen }: { course: any; onOpen: (id: string) => void }) {
  const lang = "en" as "en" | "ar"
  const statusColors = {
    "in-progress": "text-primary bg-primary/10",
    "completed": "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950",
    "not-started": "text-muted-foreground bg-muted",
  }
  return (
    <div
      className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
      onClick={() => onOpen(course.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen(course.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{course.name[lang]}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{course.department[lang]}</p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", statusColors[(course.status ?? "not-started") as keyof typeof statusColors])}>
          {tr(course.status?.replace("-", "") === "inprogress" ? "inProgress" : (course.status ?? "notStarted"), lang)}
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{tr("progress", lang)}</span>
          <span>{course.progress ?? 0}%</span>
        </div>
        <Progress value={course.progress ?? 0} className="h-1.5" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{course.sessions.length} {tr("sessions", lang)}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  )
}

export default function SubscriberDashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const lang = "en" as "en" | "ar"
  const dir = "ltr" as "ltr" | "rtl"
  const activeProgram = null // Will be handled via context later
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight

  const { data: analytics, loading: loadingAnalytics } = useSubscriberAnalytics()
  const { courses: apiCourses, loading: loadingCourses } = useCourses()

  const onOpenCourse = (id: string) => {
    router.push(`/subscriber/courses/${id}`)
  }

  // Map API courses to UI expected structure
  const visibleCourses = apiCourses.map(c => {
    const progressData = analytics?.course_progress?.find(p => p.course_id === c.course_id);
    const progress = progressData ? progressData.completion_pct : 0;
    let status = "not-started";
    if (progress > 0 && progress < 100) status = "in-progress";
    if (progress === 100) status = "completed";

    return {
      id: c.course_id,
      name: { en: c.name || "Unknown", ar: c.name || "Unknown" },
      department: { en: c.department || "General", ar: c.department || "General" },
      status,
      progress,
      sessions: Array(0).fill(1)
    };
  });

  const inProgress = visibleCourses.filter((c) => c.status === "in-progress")
  const completed = visibleCourses.filter((c) => c.status === "completed")
  const overall = visibleCourses.length
    ? Math.round(visibleCourses.reduce((s, c) => s + (c.progress ?? 0), 0) / visibleCourses.length)
    : 0

  const totalSessionsCompleted = analytics?.total_sessions_completed || 0;
  const hoursSpent = Math.round((analytics?.total_time_spent_sec || 0) / 3600);
  const recentRuns = analytics?.recent_assessments || [];

  const recommendation =
    lang === "ar"
      ? "أرى أنك أكملت 60٪ من دورة القيادة الأساسية. هل تود مراجعة سريعة قبل تقييم الغد؟"
      : "You've completed 60% of the Basic Leadership course. Would you like a quick revision before tomorrow's assessment?"

  return (
    <div className="space-y-6">
      {/* AI recommendation banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-accent/30 bg-gradient-to-br from-card to-secondary/40 p-5 sm:flex-row sm:items-center">
        <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/30" />
          <div className="relative h-full w-full overflow-hidden rounded-full ring-2 ring-accent/70 ring-offset-2 ring-offset-card">
            <Image src="/avatars/female-avatar.png" alt="Salama" fill sizes="64px" className="object-cover" />
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-accent-foreground/70">
            {tr("welcomeBack", lang)}, {user?.firstName}
          </p>
          <p className="mt-1 text-pretty text-base font-medium leading-relaxed text-foreground">
            {recommendation}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-assistant', { detail: true }))}
          className="shrink-0 gap-1.5"
        >
          {tr("continueLearning", lang)}
          <Arrow className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={TrendingUp} label={tr("overallProgress", lang)} value={`${overall}%`} />
        <StatCard icon={GraduationCap} label={tr("coursesEnrolled", lang)} value={`${visibleCourses.length}`} />
        <StatCard icon={Clock3} label={tr("hoursThisMonth", lang)} value="18.5" />
        <StatCard icon={Award} label={tr("certificatesEarned", lang)} value={`${completed.length}`} />
      </div>

      {/* Continue learning */}
      {inProgress.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {tr("continueLearning", lang)}
            </h2>
            <button
              onClick={() => router.push('/subscriber/courses')}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
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
      )}

      {/* Recent session history */}
      {recentRuns.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {tr("sessionHistory", lang)}
          </h2>
          <div className="space-y-4">
            {recentRuns.map((run: any, idx: number) => {
              return (
                <div key={idx} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Play className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{run.session_name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{tr("completed", lang)}</p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="text-xs text-muted-foreground">{run.score}% {tr("score", lang) || "Score"}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
