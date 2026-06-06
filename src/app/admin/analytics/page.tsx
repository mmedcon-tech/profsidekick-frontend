"use client";

import { BarChart2 } from 'lucide-react';

export default function AdminAnalyticsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Platform Analytics</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Platform-wide analytics — coming in Phase 4.</p>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 p-16 text-center">
        <BarChart2 size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-400">Session counts, subscriber growth, and avatar performance metrics will appear here once Phase 4 is complete.</p>
      </div>
    </div>
  );
}
