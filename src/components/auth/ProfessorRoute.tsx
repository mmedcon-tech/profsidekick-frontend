"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AuthLoadingSpinner from '@/components/auth/AuthLoadingSpinner';

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

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AuthLoadingSpinner />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      {isProfessor ? children : <AuthLoadingSpinner />}
    </ProtectedRoute>
  );
}
