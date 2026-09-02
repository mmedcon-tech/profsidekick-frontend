'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { TranscriptItem } from '@/components/learning/LearningInterface';

interface TranscriptTurnDto {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  captured_at: string;
}

/** Load persisted transcript turns when a session run starts. */
export function useTranscriptLoader(
  sessionId: string | undefined,
  sessionRunId: string | undefined,
): { loaded: boolean; initialTranscript: TranscriptItem[] } {
  const { token } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [initialTranscript, setInitialTranscript] = useState<TranscriptItem[]>([]);

  useEffect(() => {
    if (!sessionId || !sessionRunId || !token) {
      setLoaded(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          `/api/sessions/${sessionId}/run/${sessionRunId}/transcript`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
          setLoaded(true);
          return;
        }
        const data = (await response.json()) as { turns?: TranscriptTurnDto[] };
        if (cancelled) return;
        const items: TranscriptItem[] = (data.turns ?? []).map((turn) => ({
          id: turn.id,
          role: turn.role,
          text: turn.text,
        }));
        setInitialTranscript(items);
      } catch (error) {
        console.warn('Failed to load transcript:', error);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, sessionRunId, token]);

  return { loaded, initialTranscript };
}
