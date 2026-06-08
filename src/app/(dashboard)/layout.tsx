"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout, {
  publisherNav,
  subscriberNav,
  adminNav,
} from '@/components/layout/DashboardLayout';
import FloatingAvatar from '@/components/avatar/FloatingAvatar';

export default function LegacyDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) return null;

  const nav =
    user?.role === 'publisher'
      ? publisherNav
      : user?.role === 'admin'
      ? adminNav
      : subscriberNav;

  const isSubscriber = user?.role === 'subscriber';

  return (
    <>
      <DashboardLayout nav={nav}>{children}</DashboardLayout>
      {isSubscriber && <FloatingAvatar />}
    </>
  );
}
