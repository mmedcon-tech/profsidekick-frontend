"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout, { subscriberNav } from '@/components/layout/DashboardLayout';
import FloatingAvatar from '@/components/avatar/FloatingAvatar';

export default function SubscriberLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user && user.role !== 'subscriber' && user.role !== 'admin') {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading || !isAuthenticated) return null;

  return (
    <>
      <DashboardLayout nav={subscriberNav}>{children}</DashboardLayout>
      <FloatingAvatar />
    </>
  );
}
