'use client';

import { useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PersistTranscriptTurnInput {
  role: 'assistant' | 'user';
  text: string;
}

const RETRY_DELAY_MS = 2000;
const MAX_RETRIES = 1;
// Dedup window: ignore identical role+text within this period
const DEDUP_WINDOW_MS = 2000;

export function useTranscriptPersistence(
  sessionId: string,
  sessionRunId?: string,
): (input: PersistTranscriptTurnInput) => Promise<void> {
  const { token } = useAuth();
  const turnIndexRef = useRef(0);
  // Time-based dedup: key → timestamp of last successful send
  const recentRef = useRef<Map<string, number>>(new Map());

  return useCallback(async ({ role, text }: PersistTranscriptTurnInput) => {
    const trimmed = text.trim();
    if (!sessionRunId || !trimmed || !token) return;

    // Time-based dedup: skip if the exact same role+text was sent very recently
    const dedupeKey = `${role}:${trimmed}`;
    const now = Date.now();
    const lastSent = recentRef.current.get(dedupeKey);
    if (lastSent && now - lastSent < DEDUP_WINDOW_MS) return;
    recentRef.current.set(dedupeKey, now);

    const turnIndex = turnIndexRef.current++;

    const payload = JSON.stringify({
      role,
      text: trimmed,
      captured_at: new Date().toISOString(),
      turn_index: turnIndex,
    });

    const doFetch = async (): Promise<Response> =>
      fetch(`/api/sessions/${sessionId}/run/${sessionRunId}/transcript`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: payload,
      });

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await doFetch();
        if (response.ok) return; // Success — done

        const detail = await response.text().catch(() => '');
        console.warn(
          `[TranscriptPersistence] attempt ${attempt + 1} failed (${response.status}):`,
          { sessionId, sessionRunId, role, turnIndex, detail },
        );

        // Don't retry on 4xx client errors (except 429 rate-limit)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return;
        }
      } catch (error) {
        console.warn(
          `[TranscriptPersistence] attempt ${attempt + 1} network error:`,
          { sessionId, sessionRunId, role, turnIndex, error },
        );
      }

      // Wait before retrying (but not after the last attempt)
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }

    // All retries exhausted — remove dedup entry so the turn can be retried
    // by a future call if the same text is spoken again.
    recentRef.current.delete(dedupeKey);
    console.error(
      `[TranscriptPersistence] permanently failed for turn ${turnIndex}:`,
      { sessionId, sessionRunId, role },
    );
  }, [sessionId, sessionRunId, token]);
}
