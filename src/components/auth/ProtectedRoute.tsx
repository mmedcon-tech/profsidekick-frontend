"use client";

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AuthLoadingSpinner from '@/components/auth/AuthLoadingSpinner';
import { normalizeRole } from '@/lib/navigation';
import type { FrontendRole } from '@/lib/roleMapping';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
  /** When set, only these normalized roles may view the page. */
  allowedRoles?: FrontendRole[];
  /** Where to send authenticated users with the wrong role. */
  roleRedirectTo?: string;
}

export default function ProtectedRoute({
  children,
  redirectTo = '/login',
  requireAuth = true,
  allowedRoles,
  roleRedirectTo = '/',
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const role = normalizeRole(user?.role);
  const roleAllowed =
    !allowedRoles || !role || allowedRoles.includes(role);

  useEffect(() => {
    if (isLoading) return;

    if (requireAuth && !isAuthenticated) {
      const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(pathname)}`;
      router.push(redirectUrl);
      return;
    }

    if (requireAuth && isAuthenticated && allowedRoles && role && !allowedRoles.includes(role)) {
      router.push(roleRedirectTo);
    }
  }, [
    isAuthenticated,
    isLoading,
    requireAuth,
    router,
    redirectTo,
    pathname,
    allowedRoles,
    role,
    roleRedirectTo,
  ]);

  if (isLoading) {
    return <AuthLoadingSpinner />;
  }

  if (requireAuth && !isAuthenticated) {
    return <AuthLoadingSpinner />;
  }

  if (requireAuth && allowedRoles && !roleAllowed) {
    return <AuthLoadingSpinner />;
  }

  return <>{children}</>;
}
