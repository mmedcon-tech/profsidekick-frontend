"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout, { adminNav } from '@/components/layout/DashboardLayout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user && user.role !== 'admin') router.push('/');
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading || !isAuthenticated || user?.role !== 'admin') return null;

  return <DashboardLayout nav={adminNav}>{children}</DashboardLayout>;
}
