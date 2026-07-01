"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { EventProvider } from '@/contexts/EventContext';
import { TranscriptProvider } from '@/contexts/TranscriptContext';
import { StructuredTranscriptProvider } from '@/contexts/StructuredTranscriptContext';
import LearningInterface from '@/components/learning/LearningInterface';
import type { ClassSession } from '@/types/types';
import type { SessionMode } from '@/lib/sessionSlideControl';
import { config } from '@/lib/config';
import { Loader2, AlertCircle, CreditCard, Lock, BookOpen } from 'lucide-react';

interface EligibilityIssue {
  code: string;
  message: string;
}

const ISSUE_ICONS: Record<string, React.ReactNode> = {
  no_credits:      <CreditCard className="h-5 w-5 shrink-0" />,
  no_subscription: <Lock className="h-5 w-5 shrink-0" />,
  not_published:   <BookOpen className="h-5 w-5 shrink-0" />,
};

const ISSUE_ACTIONS: Record<string, { label: string; href: string }> = {
  no_credits: { label: 'Redeem an access code →', href: '/subscriber/billing' },
};

function EligibilityBlock({ issues, onBack }: { issues: EligibilityIssue[]; onBack: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-4">
        <div className="text-center mb-6">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground">Can't join this session</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Please resolve the following before joining.
          </p>
        </div>

        <div className="space-y-3">
          {issues.map((issue) => (
            <div
              key={issue.code}
              className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-destructive"
            >
              {ISSUE_ICONS[issue.code] ?? <AlertCircle className="h-5 w-5 shrink-0" />}
              <div className="min-w-0">
                <p className="text-sm font-medium">{issue.message}</p>
                {ISSUE_ACTIONS[issue.code] && (
                  <a
                    href={ISSUE_ACTIONS[issue.code].href}
                    className="text-xs underline mt-1 inline-block text-destructive/80 hover:text-destructive"
                  >
                    {ISSUE_ACTIONS[issue.code].label}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onBack}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center pt-2"
        >
          ← Go back
        </button>
      </div>
    </div>
  );
}

function SessionRunInner() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [classSession, setClassSession] = useState<ClassSession | null>(null);
  const [sessionMode, setSessionMode] = useState<SessionMode>('teaching');
  const [runId, setRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<EligibilityIssue[] | null>(null);

  useEffect(() => {
    if (!token || !sessionId) return;

    (async () => {
      try {
        // Pre-flight eligibility check before attempting to start
        const eligRes = await fetch(config.getApiUrl(`/api/sessions/${sessionId}/eligibility`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (eligRes.ok) {
          const eligData = await eligRes.json();
          if (!eligData.eligible) {
            setBlockers(eligData.issues ?? []);
            setLoading(false);
            return;
          }
        }

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
        setSessionMode(runData.sessionMode ?? 'teaching');
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
        <span className="text-sm text-muted-foreground">Checking eligibility…</span>
      </div>
    );
  }

  if (blockers && blockers.length > 0) {
    return <EligibilityBlock issues={blockers} onBack={() => router.back()} />;
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
      sessionMode={sessionMode}
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
            <div className="flex h-full items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading…</span>
            </div>
          }
        >
          <SessionRunInner />
        </Suspense>
      </StructuredTranscriptProvider>
      </TranscriptProvider>
    </EventProvider>
  );
}
