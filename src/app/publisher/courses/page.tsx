"use client";

import React from 'react';
import UnifiedDashboard from '@/components/sessions/UnifiedDashboard';
import { useProgramContext } from '@/contexts/ProgramContext';

export default function PublisherCoursesPage() {
  const { activeProgram, contextReady } = useProgramContext();

  if (!contextReady) {
    return (
      <div className="space-y-4 p-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return <UnifiedDashboard key={activeProgram?.id ?? 'all'} programId={activeProgram?.id} />;
}
