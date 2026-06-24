"use client";

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import ClassCreation from '@/components/sessions/ClassCreation';
import { Loader2 } from 'lucide-react';

function NewSessionInner() {
  const { courseId } = useParams<{ courseId: string }>();
  // ClassCreation reads courseId from the `courseId` URL search param
  // We redirect to the page with that param injected
  if (typeof window !== 'undefined' && courseId) {
    const url = new URL(window.location.href);
    if (!url.searchParams.get('courseId')) {
      url.searchParams.set('courseId', courseId);
      window.history.replaceState({}, '', url.toString());
    }
  }
  return <ClassCreation />;
}

export default function NewSessionPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <NewSessionInner />
    </Suspense>
  );
}
