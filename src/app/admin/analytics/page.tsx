"use client";

import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { Users, Bot, Monitor, CreditCard, AlertCircle } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

function StatCard({ icon: Icon, label, value }: { icon: any, label: string, value: string | number }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { data, loading, error } = useAdminAnalytics();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        Failed to load analytics: {error?.message}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Analytics</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Performance and completion analytics across the platform
        </p>
      </div>

      {/* Platform stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Subscribers" value={data.total_subscribers.toLocaleString()} />
        <StatCard icon={Bot} label="Active Avatars" value={data.total_avatars.toLocaleString()} />
        <StatCard icon={Monitor} label="Total Sessions" value={data.total_session_runs.toLocaleString()} />
        <StatCard icon={CreditCard} label="Credits Consumed" value={data.total_credits_consumed.toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly completions chart */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Monthly Completions</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.monthly_completions} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" />
              <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 12, color: "#fff" }} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#colorVal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Course performance */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Course Performance</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.course_performance.map((d: any) => ({ name: d.name.en || d.name, completion: d.completion, subscribers: d.subscribers }))} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" unit="%" />
              <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 12, color: "#fff" }} />
              <Bar dataKey="completion" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* At-risk learners */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">At-Risk Subscribers</h2>
          <button className="text-xs text-primary hover:underline">View All</button>
        </div>
        <div className="space-y-3">
          {data.at_risk_learners?.map((learner: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between rounded-lg bg-red-50/50 dark:bg-red-900/10 p-3 border border-red-100 dark:border-red-900/30">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{learner.name.en || learner.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Struggling in: {learner.course.en || learner.course}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-red-600 dark:text-red-400">{learner.progress}%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Progress</p>
              </div>
            </div>
          ))}
          {(!data.at_risk_learners || data.at_risk_learners.length === 0) && (
            <p className="text-sm text-gray-500 text-center py-4">No at-risk learners identified.</p>
          )}
        </div>
      </div>
    </div>
  );
}
