"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { EventProvider } from '@/contexts/EventContext';
import { StructuredTranscriptProvider } from '@/contexts/StructuredTranscriptContext';
import LearningInterface from '@/components/learning/LearningInterface';
import type { ClassSession } from '@/types/types';
import { config } from '@/lib/config';
import { Loader2, AlertCircle } from 'lucide-react';

function SessionRunInner() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [classSession, setClassSession] = useState<ClassSession | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !sessionId) return;

    (async () => {
      try {
        // Start the session run
        const startRes = await fetch(config.getApiUrl(`/api/sessions/${sessionId}/run/start`), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const startData = await startRes.json();
        if (!startRes.ok) throw new Error(startData.detail || startData.message || `HTTP ${startRes.status}`);

        const sessionRunId: string = startData.sessionRunId;
        setRunId(sessionRunId);

        // Fetch run details (includes slides + session metadata)
        const runRes = await fetch(config.getApiUrl(`/api/sessions/${sessionId}/run/${sessionRunId}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const runData = await runRes.json();
        if (!runRes.ok) throw new Error(runData.detail || runData.message || `HTTP ${runRes.status}`);

        const session: ClassSession = {
          sessionId: runData.sessionId ?? sessionId,
          processedContent: runData.presentationDetails?.processedContent ?? '',
          slides: runData.slidesDetails ?? [],
          totalSlides: (runData.slidesDetails ?? []).length,
          createdAt: runData.startTime ?? new Date().toISOString(),
          status: 'RUNNING',
          classDetails: {
            className: runData.className ?? 'Session',
            courseName: runData.courseName ?? '',
            courseCode: runData.courseCode ?? '',
            description: runData.description,
            duration: ([30, 45, 60, 75, 90].includes(runData.duration) ? runData.duration : 60) as 30 | 45 | 60 | 75 | 90,
            visionInstructions: '',
            assistant_parameters: runData.assistantParameters ?? {
              input_audio_format: 'pcm16',
              input_audio_noice_reduction: { type: 'near_field' },
              input_audio_transcription: { language: 'en', model: 'gpt-4o-transcribe' },
            },
          },
        };
        setClassSession(session);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start session');
      } finally {
        setLoading(false);
      }
    })();
  }, [token, sessionId]);

  const handleEndSession = () => {
    router.push('/subscriber/marketplace');
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Starting session…</span>
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
              <p className="font-semibold">Failed to start session</p>
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
      sessionRunId={runId ?? undefined}
      onEndSession={handleEndSession}
    />
  );
}

export default function SessionRunPage() {
  return (
    <EventProvider>
      <StructuredTranscriptProvider>
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading…</span>
            </div>
          }
        >
          <SessionRunInner />
        </Suspense>
      </StructuredTranscriptProvider>
    </EventProvider>
  );
}
