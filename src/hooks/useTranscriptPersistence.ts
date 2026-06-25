'use client';

import { useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PersistTranscriptTurnInput {
  role: 'assistant' | 'user';
  text: string;
}

export function useTranscriptPersistence(
  sessionId: string,
  sessionRunId?: string,
): (input: PersistTranscriptTurnInput) => Promise<void> {
  const { token } = useAuth();
  const inflightRef = useRef<Set<string>>(new Set());

  return useCallback(async ({ role, text }: PersistTranscriptTurnInput) => {
    const trimmed = text.trim();
    if (!sessionRunId || !trimmed || !token) return;

    const dedupeKey = `${role}:${trimmed}`;
    if (inflightRef.current.has(dedupeKey)) return;
    inflightRef.current.add(dedupeKey);

    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/run/${sessionRunId}/transcript`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role,
            text: trimmed,
            captured_at: new Date().toISOString(),
          }),
        },
      );

      if (!response.ok) {
        console.warn('Failed to persist transcript turn:', await response.text());
      }
    } catch (error) {
      console.warn('Transcript persistence request failed:', error);
    } finally {
      inflightRef.current.delete(dedupeKey);
    }
  }, [sessionId, sessionRunId, token]);
}
