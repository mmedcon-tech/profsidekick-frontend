"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { EventProvider } from '@/contexts/EventContext';
import { TranscriptProvider } from '@/contexts/TranscriptContext';
import { StructuredTranscriptProvider } from '@/contexts/StructuredTranscriptContext';
import LearningInterface from '@/components/learning/LearningInterface';
import type { ClassSession } from '@/types/types';
import { config } from '@/lib/config';
import { Loader2, AlertCircle } from 'lucide-react';

function RunPageInner() {
  const { courseId, sessionId, runId } = useParams<{
    courseId: string;
    sessionId: string;
    runId: string;
  }>();
  const router = useRouter();
  const { token } = useAuth();

  const [classSession, setClassSession] = useState<ClassSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !sessionId || !runId) return;

    (async () => {
      try {
        const res = await fetch(config.getApiUrl(`/api/sessions/${sessionId}/run/${runId}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || data.message || `HTTP ${res.status}`);

        const session: ClassSession = {
          sessionId: data.sessionId,
          processedContent: data.presentationDetails?.processedContent ?? '',
          slides: data.slidesDetails ?? [],
          totalSlides: (data.slidesDetails ?? []).length,
          createdAt: data.startTime ?? new Date().toISOString(),
          status: 'RUNNING',
          classDetails: {
            className: data.className ?? 'Session',
            courseName: data.courseName ?? '',
            courseCode: data.courseCode ?? '',
            description: data.description,
            duration: ([30, 45, 60, 75, 90].includes(data.duration) ? data.duration : 60) as 30 | 45 | 60 | 75 | 90,
            visionInstructions: '',
            assistant_parameters: data.assistantParameters ?? {
              input_audio_format: 'pcm16',
              input_audio_noice_reduction: { type: 'near_field' },
              input_audio_transcription: { language: 'en', model: 'gpt-4o-transcribe' },
            },
          },
        };
        setClassSession(session);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    })();
  }, [token, sessionId, runId]);

  const handleEndSession = (metadata?: unknown) => {
    router.push(`/courses/${courseId}/sessions/${sessionId}`);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !classSession) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-sm w-full space-y-4 text-center">
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
            <AlertCircle className="h-6 w-6 shrink-0" />
            <div className="text-left">
              <p className="font-semibold">Failed to load session run</p>
              <p className="text-sm mt-0.5 text-destructive/80">{error}</p>
            </div>
          </div>
          <button
            onClick={() => router.back()}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <LearningInterface
      classSession={classSession}
      sessionRunId={runId}
      onEndSession={handleEndSession}
    />
  );
}

export default function SessionRunPage() {
  return (
    <EventProvider>
      <TranscriptProvider>
      <StructuredTranscriptProvider>
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <RunPageInner />
        </Suspense>
      </StructuredTranscriptProvider>
      </TranscriptProvider>
    </EventProvider>
  );
}
