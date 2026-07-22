"use client"

import { Progress } from "@/components/ui/progress"
import { BookOpen, TrendingUp, Users } from "lucide-react"
import { normalizeCompletionPercent } from "@/lib/analyticsLabels"

export interface CoursePerformanceRow {
  name: string
  completion: number
  subscribers?: number
}

interface CoursePerformanceMetricsProps {
  rows: CoursePerformanceRow[]
  loading?: boolean
  emptyLabel?: string
}

function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3">
      <div className="h-4 flex-1 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-2 w-24 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  )
}

function MetricPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  )
}

/** Readable course stats — no bar charts with cramped axis labels. */
export function CoursePerformanceMetrics({
  rows,
  loading = false,
  emptyLabel = "No course data yet",
}: CoursePerformanceMetricsProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 py-10">
        <BookOpen className="h-5 w-5 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400 dark:text-gray-500">{emptyLabel}</p>
      </div>
    )
  }

  const normalized = rows.map((row) => ({
    ...row,
    name: row.name?.trim() || "Untitled course",
    completion: normalizeCompletionPercent(row.completion),
  }))

  const avgCompletion = Math.round(
    normalized.reduce((sum, r) => sum + r.completion, 0) / normalized.length,
  )
  const totalEnrolled = normalized.reduce((sum, r) => sum + (r.subscribers ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricPill icon={BookOpen} label="Courses" value={`${normalized.length}`} />
        <MetricPill icon={TrendingUp} label="Avg completion" value={`${avgCompletion}%`} />
        <MetricPill
          icon={Users}
          label="Enrolled"
          value={totalEnrolled > 0 ? `${totalEnrolled}` : "—"}
        />
      </div>

      {/* Fixed height so long course lists scroll inside the card */}
      <ul className="max-h-64 space-y-2 overflow-y-auto pe-1 overscroll-contain">
        {normalized.map((row, i) => (
          <li
            key={`${row.name}-${i}`}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 px-4 py-3"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p
                  className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words"
                  title={row.name}
                >
                  {row.name}
                </p>
                {row.subscribers != null && row.subscribers > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {row.subscribers} subscriber{row.subscribers === 1 ? "" : "s"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 sm:w-52 shrink-0">
                <Progress value={row.completion} className="h-2 flex-1" />
                <span className="w-12 text-end text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                  {row.completion}%
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export interface MonthlyCompletionRow {
  month: string
  value: number
}

/** Monthly totals as a simple number list instead of an area chart. */
export function MonthlyCompletionMetrics({
  rows,
  loading = false,
  emptyLabel = "No completion data yet",
}: {
  rows: MonthlyCompletionRow[]
  loading?: boolean
  emptyLabel?: string
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse h-20 rounded-xl bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 py-10">
        <TrendingUp className="h-5 w-5 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400 dark:text-gray-500">{emptyLabel}</p>
      </div>
    )
  }

  const total = rows.reduce((sum, r) => sum + (Number(r.value) || 0), 0)
  const latest = rows[rows.length - 1]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricPill icon={TrendingUp} label="Total completions" value={`${total}`} />
        <MetricPill
          icon={TrendingUp}
          label={String(latest?.month ?? "Latest")}
          value={`${Number(latest?.value) || 0}`}
        />
      </div>
      {/* Fixed height so longer monthly histories scroll inside the card */}
      <ul className="max-h-64 divide-y divide-gray-200 dark:divide-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 overflow-y-auto overscroll-contain">
        {rows.map((row, i) => (
          <li
            key={`${row.month}-${i}`}
            className="flex items-center justify-between gap-3 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm"
          >
            <span className="font-medium text-gray-700 dark:text-gray-300 break-words min-w-0">
              {String(row.month || "—")}
            </span>
            <span className="font-bold tabular-nums text-gray-900 dark:text-gray-100 shrink-0">
              {Number(row.value) || 0}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
