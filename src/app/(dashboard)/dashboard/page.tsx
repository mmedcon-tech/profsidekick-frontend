"use client";

import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import UnifiedDashboard from '@/components/sessions/UnifiedDashboard';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <UnifiedDashboard />
    </ProtectedRoute>
  );
} 