"use client"

import { tr } from "@/lib/v2/i18n"
import { useAdminAnalytics } from "@/hooks/useAdminAnalytics"
import { Users, Bot, Layers, TrendingUp, Monitor, Info } from "lucide-react"
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
  Area, AreaChart, CartesianGrid,
} from "recharts"

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

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
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

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
      <Info className="h-5 w-5 text-gray-300 dark:text-gray-600" />
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
    </div>
  )
}

// ── Chart colors — concrete hsl() so recharts can render them ────────────────
const CHART_BLUE  = "hsl(213 94% 58%)"
const CHART_GOLD  = "hsl(46 65% 52%)"
const CHART_MUTED = "hsl(220 13% 91%)"

const TooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
} as const

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const lang = "en" as "en" | "ar"
  const { data: analytics, loading } = useAdminAnalytics()

  const coursePerf   = analytics?.course_performance  ?? []
  const monthlyComps = analytics?.monthly_completions ?? []

  return (
    <div className="px-4 sm:px-6 py-6 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
          MyOS Platform Admin
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Platform Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Platform-wide overview across all publishers and subscribers.
        </p>
      </div>

      {/* Stats — 3 on md, 6 on xl */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              icon={Users}
              label={tr("totalPublishers", lang)}
              value={`${analytics?.total_publishers ?? 0}`}
              accent
            />
            <StatCard
              icon={Bot}
              label={tr("totalSubscribers", lang)}
              value={`${analytics?.total_subscribers ?? 0}`}
            />
            <StatCard
              icon={Layers}
              label={tr("activeAvatars", lang)}
              value={`${analytics?.total_avatars ?? 0}`}
            />
            <StatCard
              icon={TrendingUp}
              label={tr("totalSessions", lang)}
              value={`${(analytics?.active_sessions_today ?? 0).toLocaleString()}`}
            />
            <StatCard
              icon={Monitor}
              label={tr("systemHealth", lang)}
              value={`${analytics?.system_health ?? 100}%`}
              sub="All systems operational"
            />
            <StatCard
              icon={TrendingUp}
              label="Total Users"
              value={`${analytics?.total_users ?? 0}`}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Bar: Course Performance */}
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
                            fill="var(--muted-foreground)"
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
                    <linearGradient id="adminFill" x1="0" y1="0" x2="0" y2="1">
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
                    fill="url(#adminFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
