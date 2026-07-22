"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedLayout } from '@/components/layout/ThemedLayout';
import { toFrontendRole } from '@/lib/roleMapping';

function clearLocalAuthSession(): void {
  try {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_expires_at');
  } catch {
    // ignore
  }
}

function isPublisherRole(role: string | undefined): boolean {
  const normalized = toFrontendRole(role) ?? role;
  return normalized === 'publisher' || normalized === 'admin';
}

export default function PublisherLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      window.location.replace('/login');
      return;
    }
    if (user && !isPublisherRole(user.role)) {
      window.location.replace('/');
    }
  }, [isAuthenticated, isLoading, user]);

  useEffect(() => {
    // Show escape hatch quickly — auth should never take this long.
    const timer = window.setTimeout(() => setStuck(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  if (isLoading || !isAuthenticated || (user && !isPublisherRole(user.role))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center max-w-sm px-6">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {!isLoading && !isAuthenticated
              ? 'Redirecting to login…'
              : 'Loading publisher dashboard…'}
          </p>
          {stuck && (
            <button
              type="button"
              onClick={() => {
                clearLocalAuthSession();
                window.location.replace('/login');
              }}
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white"
            >
              Stuck? Clear session & go to login
            </button>
          )}
        </div>
      </div>
    );
  }

  return <ThemedLayout>{children}</ThemedLayout>;
}
