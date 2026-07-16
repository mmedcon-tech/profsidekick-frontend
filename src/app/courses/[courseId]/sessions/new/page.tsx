"use client";

import { Suspense } from 'react';
import ClassCreation from '@/components/sessions/ClassCreation';
import { Loader2 } from 'lucide-react';

function NewSessionInner() {
  return <ClassCreation />;
}

export default function NewSessionPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <NewSessionInner />
    </Suspense>
  );
}
