"use client"

import { tr } from "@/lib/v2/i18n"
import { useAdminAnalytics } from "@/hooks/useAdminAnalytics"
import { Users, Bot, Layers, TrendingUp, CreditCard, Monitor } from "lucide-react"
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
  Area, AreaChart, CartesianGrid,
} from "recharts"

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof Bot; label: string; value: string; sub?: string }) {
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

export default function AdminDashboardPage() {
  const lang = "en" as "en" | "ar"
  const { data: analytics, loading } = useAdminAnalytics()

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-card to-secondary/40 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">MyOS Platform Admin</p>
        <h1 className="mt-1 text-xl font-bold text-foreground">
          {lang === "ar" ? "لوحة تحكم المنصة" : "Platform Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "ar"
            ? "نظرة عامة على المنصة بالكامل عبر جميع الناشرين والمشتركين."
            : "Platform-wide overview across all publishers and subscribers."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Users} label={tr("totalPublishers", lang)} value={`${analytics?.total_publishers || 0}`} />
        <StatCard icon={Bot} label={tr("totalSubscribers", lang)} value={`${analytics?.total_subscribers || 0}`} />
        <StatCard icon={Layers} label={tr("activeAvatars", lang)} value={`${analytics?.total_users || 0}`} />
        <StatCard icon={TrendingUp} label={tr("totalSessions", lang)} value={`${(analytics?.active_sessions_today || 0).toLocaleString()}`} />
        <StatCard icon={CreditCard} label={tr("creditsUsed", lang)} value="N/A" />
        <StatCard icon={Monitor} label={tr("systemHealth", lang)} value={`${analytics?.system_health || 100}%`} sub="All systems operational" />
      </div>

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
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" }}
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
                  <linearGradient id="fillAdmin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" }} />
                <Area type="monotone" dataKey="value" stroke="var(--chart-2)" strokeWidth={2} fill="url(#fillAdmin)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
