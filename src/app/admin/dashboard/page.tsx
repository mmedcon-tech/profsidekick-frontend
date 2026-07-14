"use client"

import { tr } from "@/lib/v2/i18n"
import { useAdminAnalytics } from "@/hooks/useAdminAnalytics"
import {
  CoursePerformanceMetrics,
  MonthlyCompletionMetrics,
} from "@/components/publisher/CoursePerformanceMetrics"
import { normalizeCompletionPercent, resolveLocalizedLabel } from "@/lib/analyticsLabels"
import { Users, Bot, Layers, TrendingUp, Monitor } from "lucide-react"

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

export default function AdminDashboardPage() {
  const lang = "en" as "en" | "ar"
  const { data: analytics, loading } = useAdminAnalytics()

  const courseRows = (analytics?.course_performance ?? []).map((d: {
    name?: unknown
    completion?: unknown
    subscribers?: number
  }) => ({
    name: resolveLocalizedLabel(d.name, lang),
    completion: normalizeCompletionPercent(d.completion),
    subscribers: d.subscribers,
  }))

  const monthlyComps = analytics?.monthly_completions ?? []

  return (
    <div className="px-4 sm:px-6 py-6 space-y-6 max-w-6xl mx-auto">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-900 dark:text-gray-100">
            Course Performance
          </h3>
          <CoursePerformanceMetrics rows={courseRows} loading={loading} />
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-900 dark:text-gray-100">
            {tr("monthlyCompletions", lang)}
          </h3>
          <MonthlyCompletionMetrics rows={monthlyComps} loading={loading} />
        </div>
      </div>
    </div>
  )
}
