"use client";

import { BarChart2 } from 'lucide-react';

export default function PublisherAnalyticsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics</h1>
      <p className="text-gray-500 mb-8">Publisher analytics dashboard — coming in Phase 4.</p>
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
        <BarChart2 size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-400">Session metrics and subscriber engagement will appear here once Phase 4 is complete.</p>
      </div>
    </div>
  );
}
