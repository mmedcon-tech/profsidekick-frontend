"use client"

import { useAuth } from "@/contexts/AuthContext"
import { tr } from "@/lib/v2/i18n"
import { useProgramContext } from "@/contexts/ProgramContext"
import { usePublisherAnalytics } from "@/hooks/usePublisherAnalytics"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Bot, BookOpen, Users, TrendingUp, AlertTriangle, Sparkles, ArrowRight } from "lucide-react"
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
  Area, AreaChart, CartesianGrid,
} from "recharts"

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Bot; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export default function PublisherDashboardPage() {
  const { user } = useAuth()
  const lang = "en"
  const { activeProgram, contextReady } = useProgramContext()

  const { data: analytics, loading } = usePublisherAnalytics(
    contextReady ? activeProgram?.id : undefined
  )

  const totalSubscribers = analytics?.total_subscribers || 0
  const totalCourses = analytics?.total_courses || 0
  const totalSessions = analytics?.total_sessions || 0
  const totalAvatars = analytics?.total_avatars || 0

  const recs = lang === "ar"
    ? [
        "3 مشتركين متأخرون عن دورة أساسيات السلامة — يُقترح إرسال تذكير آلي.",
        "أداء دورة القيادة هو الأعلى (91٪) — فكر في مشاركة أفضل الممارسات.",
        "معدل إكمال دورة حوكمة الذكاء الاصطناعي منخفض — يُنصح بإضافة جلسة مراجعة.",
      ]
    : [
        "3 subscribers are behind on OHS Basics — suggest sending an automated reminder.",
        "Leadership course leads completion (91%) — consider sharing best practices.",
        "AI Governance completion is low — recommend adding an oral revision session.",
      ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-card to-secondary/40 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {tr("welcomeBack", lang)}, {user?.firstName}
        </p>
        <h1 className="mt-1 text-xl font-bold text-foreground">
          {lang === "ar" ? "لوحة تحكم الناشر" : "Publisher Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "ar"
            ? "نظرة عامة على مساعديك وبرامجك وأداء المشتركين."
            : "Overview of your avatars, programs, and subscriber performance."}
        </p>
      </div>

      {/* Program scope banner */}
      {contextReady && activeProgram && (
        <div className="flex items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-foreground">
            Showing stats for <span className="font-semibold">{activeProgram.name.en}</span>
          </span>
          <span className="text-muted-foreground">— switch to MyOS to see all</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Bot} label={tr("myAvatars", lang)} value={`${totalAvatars}`} />
        <Stat icon={Users} label={tr("totalSubscribers", lang)} value={`${totalSubscribers}`} />
        <Stat icon={BookOpen} label={tr("activeCourses", lang)} value={`${totalCourses}`} />
        <Stat icon={TrendingUp} label={tr("totalSessions", lang)} value={`${totalSessions}`} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">{lang === "ar" ? "أداء الدورات" : "Course Performance"}</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.course_performance || []} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey={(d) => d.name[lang] || d.name}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--popover-foreground)",
                  }}
                  formatter={(v) => [`${v}%`, tr("completionRate", lang)]}
                />
                <Bar dataKey="completion" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">{tr("monthlyCompletions", lang)}</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.monthly_completions || []} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="fill2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--popover-foreground)",
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="var(--chart-2)" strokeWidth={2} fill="url(#fill2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* At risk + AI recs */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            {lang === "ar" ? "المشتركون المعرضون للخطر" : "Subscribers At Risk"}
          </h3>
          <ul className="space-y-3">
            {(analytics?.at_risk_learners || []).map((e: any, i: number) => (
              <li key={i} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{e.name[lang] || e.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{e.course[lang] || e.course}</p>
                </div>
                <div className="w-28">
                  <Progress value={e.progress} className="h-1.5" />
                </div>
                <span className="w-10 text-end text-xs font-medium text-destructive">{e.progress}%</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-card to-secondary/40 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-accent" />
            {tr("aiRecommendations", lang)}
          </h3>
          <ul className="space-y-3">
            {recs.map((r, i) => (
              <li key={i} className="flex gap-2.5 rounded-lg bg-background/60 p-3 text-sm leading-relaxed text-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
