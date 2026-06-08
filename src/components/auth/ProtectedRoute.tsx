"use client";

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AuthLoadingSpinner from '@/components/auth/AuthLoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}

export default function ProtectedRoute({
  children,
  redirectTo = '/login',
  requireAuth = true,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(pathname)}`;
      router.push(redirectUrl);
    }
  }, [isAuthenticated, isLoading, requireAuth, router, redirectTo, pathname]);

  if (isLoading) {
    return <AuthLoadingSpinner />;
  }

  if (requireAuth && !isAuthenticated) {
    return <AuthLoadingSpinner />;
  }

  return <>{children}</>;
}
