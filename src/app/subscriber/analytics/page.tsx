"use client"

import { tr } from "@/lib/v2/i18n"
import { Progress } from "@/components/ui/progress"
import { useSubscriberAnalytics } from "@/hooks/useSubscriberAnalytics"
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"

export default function AnalyticsPage() {
  const lang = "en"
  const { data, loading } = useSubscriberAnalytics()

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  const totalSessions = data?.total_sessions_completed ?? 0
  const totalMinutes = Math.round((data?.total_time_spent_sec ?? 0) / 60)
  const courseProgressList = data?.course_progress ?? []
  const enrolledCount = courseProgressList.length
  const assessments = data?.recent_assessments ?? []

  const scoredAssessments = assessments.filter(a => a.score !== null && a.score !== undefined)
  const avgScore = scoredAssessments.length > 0
    ? Math.round(scoredAssessments.reduce((s, a) => s + (a.score ?? 0), 0) / scoredAssessments.length)
    : 0

  // Weekly activity — group assessments by day-of-week from generated_at
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const minutesPerDay = new Map(dayNames.map(d => [d, 0]))
  assessments.forEach(a => {
    const day = dayNames[new Date(a.generated_at).getDay()]
    minutesPerDay.set(day, minutesPerDay.get(day)! + 1) // 1 unit per completed run
  })
  const weeklyActivityData = dayNames.map(day => ({ day, sessions: minutesPerDay.get(day)! }))

  // Assessment bar chart — index as label, score as value
  const assessmentChartData = scoredAssessments.map((a, i) => ({
    label: `Run ${i + 1}`,
    score: Math.round(a.score ?? 0),
    questions: a.question_count,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{tr("analytics", lang)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your personal progress and learning statistics
        </p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Enrolled Courses", value: enrolledCount },
          { label: "Sessions Completed", value: totalSessions },
          { label: "Total Time (min)", value: totalMinutes },
          { label: "Avg. Assessment Score", value: avgScore > 0 ? `${avgScore}%` : "—" },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Weekly activity */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Weekly Assessment Activity
        </h2>
        {assessments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No session activity yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={weeklyActivityData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <Tooltip
                contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [v, "sessions"]}
              />
              <Area type="monotone" dataKey="sessions" stroke="var(--color-primary)" strokeWidth={2} fill="url(#actGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Course progress */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Course Progress</h2>
        {courseProgressList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No courses enrolled yet.</p>
        ) : (
          <div className="space-y-4">
            {courseProgressList.map((c) => (
              <div key={c.course_id}>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{c.course_name}</p>
                  <span className="text-xs font-semibold text-primary">
                    {Math.round(c.completion_pct)}%
                  </span>
                </div>
                <Progress value={c.completion_pct} className="h-2" />
                <p className="mt-1 text-xs text-muted-foreground">
                  {Math.round(c.time_spent_sec / 60)} min spent
                  {c.last_session_at
                    ? ` · Last active ${new Date(c.last_session_at).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assessment scores */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Recent Assessment Scores</h2>
        {assessmentChartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assessments completed yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={assessmentChartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" unit="%" />
              <Tooltip
                contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v, _n, item) => [`${v}% (${item.payload.questions} questions)`, "Score"]}
              />
              <Bar dataKey="score" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Assessment history */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Assessment History</h2>
        {assessments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assessments yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {assessments.map((a) => (
              <div key={a.session_run_id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    Assessment Run
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.question_count} question{a.question_count !== 1 ? "s" : ""} ·{" "}
                    {new Date(a.generated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="shrink-0 ps-4">
                  {a.score !== null && a.score !== undefined ? (
                    <span className={`text-sm font-semibold ${a.score >= 70 ? "text-primary" : "text-destructive"}`}>
                      {Math.round(a.score)}%
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No score</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
