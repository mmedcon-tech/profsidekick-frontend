"use client"

import { useAppV2 } from "@/lib/v2/context"
import { tr } from "@/lib/v2/i18n"
import { courses } from "@/lib/v2/data"
import { Progress } from "@/components/ui/progress"
import { useSubscriberAnalytics } from "@/hooks/useSubscriberAnalytics"
import { useSessionRuns } from "@/hooks/useSessionRuns"
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"

const weeklyActivity = [
  { day: "Mon", minutes: 0 }, { day: "Tue", minutes: 45 },
  { day: "Wed", minutes: 30 }, { day: "Thu", minutes: 60 },
  { day: "Fri", minutes: 20 }, { day: "Sat", minutes: 0 },
  { day: "Sun", minutes: 75 },
]

const sessionHistory = [
  { id: "r1", course: { en: "AI Governance & Transformation", ar: "O-U^UU.Oc O U,OUO O O U,O OOU+O O1US U^O U,OO-U^U," }, session: { en: "Foundations of AI", ar: "OO3O O3USO O O U,OUO O O U,O OOU+O O1US" }, date: "2026-06-09", duration: 32, score: null },
  { id: "r2", course: { en: "AI Governance & Transformation", ar: "O-U^UU.Oc O U,OUO O O U,O OOU+O O1US U^O U,OO-U^U," }, session: { en: "Data Privacy & PDPL", ar: "OrOU^OUSOc O U,O"USO U+O O U^U,O U+U^U+ O-U.O USOc O U,O"USO U+O O" }, date: "2026-06-07", duration: 41, score: null },
  { id: "r3", course: { en: "Basic Level Leadership", ar: "O U,U,USO O_Oc O U,OO3O O3USOc" }, session: { en: "Crisis Leadership", ar: "U,USO O_Oc O U,OOU.O O" }, date: "2026-06-04", duration: 28, score: 88 },
  { id: "r4", course: { en: "Basic Level Leadership", ar: "O U,U,USO O_Oc O U,OO3O O3USOc" }, session: { en: "Decision Making", ar: "OU+O1 O U,U,OO O" }, date: "2026-06-01", duration: 35, score: null },
]

const assessmentScores = [
  { name: { en: "AI Ethics", ar: "OOrU,O U,USO O O U,OUO O O U,O OOU+O O1US" }, score: 88 },
  { name: { en: "PDPL Quiz", ar: "O OrOO"O O O-U.O USOc O U,O"USO U+O O" }, score: 74 },
  { name: { en: "Leadership", ar: "O U,U,USO O_Oc" }, score: 92 },
]

export default function AnalyticsPage() {
  const { lang, dir } = useAppV2();
  const { data: analyticsData, loading } = useSubscriberAnalytics();
  const { runs } = useSessionRuns(); // We'll keep useSessionRuns for Weekly Activity/History

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">{tr("loading", lang)}...</div>;
  }

  // Safely fallback if data isn't loaded yet
  const totalSessions = analyticsData?.total_sessions_completed ?? 0;
  const totalMinutes = Math.round((analyticsData?.total_time_spent_sec ?? 0) / 60);
  
  // Real course progress from analytics API
  const courseProgressList = analyticsData?.course_progress ?? [];
  const enrolledCount = courseProgressList.length;

  // Real assessment scores from analytics API
  const realAssessments = analyticsData?.recent_assessments ?? [];
  const avgScore = realAssessments.length > 0 
    ? Math.round(realAssessments.reduce((s, a) => s + a.score, 0) / realAssessments.length)
    : 0;

  // For weekly activity and session history, map from `useSessionRuns`
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  
  const recentRuns = (runs ?? []).filter(r => new Date(r.created_at) > last7Days)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Aggregate weekly minutes by day name
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyMap = new Map(dayNames.map(d => [d, 0]));
  recentRuns.forEach(r => {
    const dayName = dayNames[new Date(r.created_at).getDay()];
    weeklyMap.set(dayName, weeklyMap.get(dayName)! + ((r.duration ?? 0) / 60));
  });
  const weeklyActivityData = Array.from(weeklyMap.entries()).map(([day, minutes]) => ({ day, minutes: Math.round(minutes) }));

  return (
    <div dir={dir} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{tr("analytics", lang)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "ar" ? "OU,O_U.U O U,O'OrOUS U^OO-OO OO O O U,OO1U,U." : "Your personal progress and learning statistics"}
        </p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: { en: "Enrolled Courses", ar: "O U,O_U^OO O O U,U.O3OU,Oc" }, value: enrolledCount },
          { label: { en: "Sessions Completed", ar: "O U,OU,O3O O O U,U.UOU.U,Oc" }, value: totalSessions },
          { label: { en: "Minutes This Week", ar: "O_U,O OU, UOO  O U,OO3O"U^O1" }, value: totalMinutes },
          { label: { en: "Avg. Assessment Score", ar: "U.OU^O3O U+OUSOOc O U,OU,USUSU." }, value: `${avgScore}%` },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{stat.label[lang]}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Weekly activity */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          {lang === "ar" ? "O U,U+O'O O O U,OO3O"U^O1US (O_U,O OU,)" : "Weekly Activity (minutes)"}
        </h2>
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
            <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
            <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
            <Area type="monotone" dataKey="minutes" stroke="var(--color-primary)" strokeWidth={2} fill="url(#actGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Course progress */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          {lang === "ar" ? "OU,O_U. O U,O_U^OO O" : "Course Progress"}
        </h2>
        <div className="space-y-4">
          {courseProgressList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active courses yet.</p>
          ) : (
            courseProgressList.map((c) => (
              <div key={c.course_id}>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{c.course_name}</p>
                  <span className="text-xs font-semibold text-primary">{Math.round(c.progress_percentage)}%</span>
                </div>
                <Progress value={c.progress_percentage} className="h-2" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Assessment scores */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          {lang === "ar" ? "U+OO OO O U,OU,USUSU.O O" : "Assessment Scores"}
        </h2>
        {realAssessments.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No assessments completed.</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={realAssessments} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="session_name" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" unit="%" />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="score" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Session history */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          {lang === "ar" ? "O3OU, O U,OU,O3O O" : "Session History"}
        </h2>
        <div className="divide-y divide-border">
          {recentRuns.length === 0 ? (
             <p className="py-2 text-sm text-muted-foreground">No recent sessions.</p>
          ) : (
             recentRuns.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">Session</p>
                  <p className="truncate text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 ps-4">
                  <span className="text-xs text-muted-foreground">{Math.round((r.duration ?? 0)/60)} {lang === "ar" ? "O_" : "min"}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
