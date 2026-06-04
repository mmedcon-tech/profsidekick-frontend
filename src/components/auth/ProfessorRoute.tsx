"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface ProfessorRouteProps {
  children: React.ReactNode;
}

export default function ProfessorRoute({ children }: ProfessorRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const isProfessor = user?.role === 'professor' || (user?.role !== 'student' && !!user?.role);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !isProfessor) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, isProfessor, router]);

  return (
    <ProtectedRoute>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : isProfessor ? (
        children
      ) : null}
    </ProtectedRoute>
  );
}
