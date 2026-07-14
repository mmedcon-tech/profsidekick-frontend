"use client";

import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import {
  CoursePerformanceMetrics,
  MonthlyCompletionMetrics,
} from '@/components/publisher/CoursePerformanceMetrics';
import { normalizeCompletionPercent, resolveLocalizedLabel } from '@/lib/analyticsLabels';
import { Users, Bot, Monitor, CreditCard, AlertCircle } from 'lucide-react';

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
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

  const courseRows = (data.course_performance ?? []).map((d: {
    name?: unknown;
    completion?: unknown;
    subscribers?: number;
  }) => ({
    name: resolveLocalizedLabel(d.name, 'en'),
    completion: normalizeCompletionPercent(d.completion),
    subscribers: d.subscribers,
  }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Analytics</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Performance and completion analytics across the platform
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Subscribers" value={data.total_subscribers.toLocaleString()} />
        <StatCard icon={Bot} label="Active Avatars" value={data.total_avatars.toLocaleString()} />
        <StatCard icon={Monitor} label="Total Sessions" value={data.total_session_runs.toLocaleString()} />
        <StatCard icon={CreditCard} label="Credits Consumed" value={data.total_credits_consumed.toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Course Performance</h2>
          <CoursePerformanceMetrics rows={courseRows} />
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Monthly Completions</h2>
          <MonthlyCompletionMetrics rows={data.monthly_completions ?? []} />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">At-Risk Subscribers</h2>
        </div>
        <div className="space-y-3">
          {data.at_risk_learners?.map((learner: {
            name?: unknown;
            course?: unknown;
            progress?: unknown;
          }, idx: number) => (
            <div key={idx} className="flex items-center justify-between rounded-lg bg-red-50/50 dark:bg-red-900/10 p-3 border border-red-100 dark:border-red-900/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 shrink-0">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white break-words">
                    {resolveLocalizedLabel(learner.name)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 break-words">
                    Struggling in: {resolveLocalizedLabel(learner.course)}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-red-600 dark:text-red-400">
                  {normalizeCompletionPercent(learner.progress)}%
                </p>
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
