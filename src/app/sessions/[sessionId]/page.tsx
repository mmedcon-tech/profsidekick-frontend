"use client";

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function SessionRedirectPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!sessionId || !user) return;
    if (user.role === 'publisher' || user.role === 'admin') {
      router.replace(`/publisher/sessions/${sessionId}/chat`);
    } else {
      // Subscribers need a course context — send them home to find the session
      router.replace(`/subscriber/marketplace`);
    }
  }, [sessionId, user, router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
