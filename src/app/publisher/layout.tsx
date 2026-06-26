"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout, { filteredPublisherNav } from '@/components/layout/DashboardLayout';

export default function PublisherLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user && user.role !== 'publisher' && user.role !== 'admin') {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading || !isAuthenticated) return null;

  return <DashboardLayout nav={filteredPublisherNav}>{children}</DashboardLayout>;
}
