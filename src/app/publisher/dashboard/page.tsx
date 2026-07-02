"use client"

import { useAuth } from "@/contexts/AuthContext"
import { tr } from "@/lib/v2/i18n"
import { useProgramContext } from "@/contexts/ProgramContext"
import { usePublisherAnalytics } from "@/hooks/usePublisherAnalytics"
import { Progress } from "@/components/ui/progress"
import {
  Bot, BookOpen, Users, TrendingUp, AlertTriangle,
  LayoutGrid, Info,
} from "lucide-react"
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
  Area, AreaChart, CartesianGrid,
} from "recharts"

// ── Skeleton primitives ──────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700 ${className ?? ""}`}
    />
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

// ── Stat card ────────────────────────────────────────────────────────────────

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Bot
  label: string
  value: string
  sub?: string
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
      {sub && <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  )
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
      <Info className="h-5 w-5 text-gray-300 dark:text-gray-600" />
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
    </div>
  )
}

// ── Chart colors — resolved to hsl() so recharts can consume them directly ──
const CHART_BLUE  = "hsl(213 94% 58%)"
const CHART_GOLD  = "hsl(46 65% 52%)"
const CHART_MUTED = "hsl(220 13% 91%)"

// ── Custom tooltip ────────────────────────────────────────────────────────────

const TooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
} as const

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PublisherDashboardPage() {
  const { user } = useAuth()
  const lang = "en" as "en" | "ar"
  const { activeProgram, contextReady } = useProgramContext()

  const { data: analytics, loading } = usePublisherAnalytics(
    contextReady ? activeProgram?.id : undefined
  )

  const totalSubscribers = analytics?.total_subscribers ?? 0
  const totalCourses     = analytics?.total_courses     ?? 0
  const totalSessions    = analytics?.total_sessions    ?? 0
  const totalAvatars     = analytics?.total_avatars     ?? 0

  const coursePerf     = analytics?.course_performance    ?? []
  const monthlyComps   = analytics?.monthly_completions   ?? []
  const atRisk         = analytics?.at_risk_learners      ?? []

  return (
    <div className="px-4 sm:px-6 py-6 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {tr("welcomeBack", lang)}, {user?.firstName}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Publisher Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Overview of your avatars, programs, and subscriber performance.
        </p>
      </div>

      {/* Program scope banner */}
      {contextReady && activeProgram && (
        <div className="flex items-center gap-2.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-4 py-2.5 text-sm">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-gray-700 dark:text-gray-300">
            Showing stats for{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {activeProgram.name.en}
            </span>
          </span>
          <span className="text-gray-400 dark:text-gray-500">— switch to MyOS to see all</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <Stat icon={Bot}        label={tr("myAvatars", lang)}        value={`${totalAvatars}`}     accent />
            <Stat icon={Users}      label={tr("totalSubscribers", lang)} value={`${totalSubscribers}`} />
            <Stat icon={BookOpen}   label={tr("activeCourses", lang)}    value={`${totalCourses}`}     />
            <Stat icon={TrendingUp} label={tr("totalSessions", lang)}    value={`${totalSessions}`}    />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Bar: Course Completion */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-900 dark:text-gray-100">
            Course Performance
          </h3>
          {loading ? (
            <SkeletonBlock className="h-56 w-full" />
          ) : coursePerf.length === 0 ? (
            <EmptyChart label="No course data yet" />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coursePerf} margin={{ top: 4, right: 8, left: -16, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey={(d: any) => d.name[lang] ?? d.name}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    height={60}
                    tick={({ x, y, payload }: any) => {
                      const name = String(payload.value)
                      const label = name.length > 14 ? name.slice(0, 14) + "…" : name
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={0} y={0} dy={6}
                            textAnchor="end"
                            fill="currentColor"
                            className="fill-gray-400 dark:fill-gray-500"
                            fontSize={11}
                            transform="rotate(-35)"
                          >
                            {label}
                          </text>
                        </g>
                      )
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    cursor={{ fill: CHART_MUTED, opacity: 0.3 }}
                    contentStyle={TooltipStyle}
                    formatter={(v: any) => [`${v}%`, "Completion"]}
                  />
                  <Bar
                    dataKey="completion"
                    fill={CHART_BLUE}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Area: Monthly Completions */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-900 dark:text-gray-100">
            {tr("monthlyCompletions", lang)}
          </h3>
          {loading ? (
            <SkeletonBlock className="h-56 w-full" />
          ) : monthlyComps.length === 0 ? (
            <EmptyChart label="No completion data yet" />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyComps} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pubFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={CHART_GOLD} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART_GOLD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip contentStyle={TooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={CHART_GOLD}
                    strokeWidth={2}
                    fill="url(#pubFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* At-risk learners */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray-900 dark:text-gray-100">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          Subscribers At Risk
        </h3>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <SkeletonBlock className="h-4 flex-1" />
                <SkeletonBlock className="h-2 w-28" />
                <SkeletonBlock className="h-4 w-10" />
              </div>
            ))}
          </div>
        ) : atRisk.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-8">
            <LayoutGrid className="h-5 w-5 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-400 dark:text-gray-500">All subscribers are on track</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {atRisk.map((e: any, i: number) => (
              <li key={i} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {e.name[lang] ?? e.name}
                  </p>
                  <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                    {e.course[lang] ?? e.course}
                  </p>
                </div>
                <div className="w-28 shrink-0">
                  <Progress value={e.progress} className="h-1.5" />
                </div>
                <span className="w-10 shrink-0 text-end text-xs font-semibold text-red-500">
                  {e.progress}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
