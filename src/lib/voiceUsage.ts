import { config } from '@/lib/config';
import type { VoiceProvider } from '@/types/types';

export interface VoiceUsageResult {
  ok: boolean;
  /** True when the backend rejected the charge for insufficient credits (HTTP 402). */
  insufficientCredits: boolean;
  creditsCharged?: number;
  newBalance?: number;
}

/**
 * Meter a synthesized TTS utterance for the dual voice pipeline's usage-based
 * billing (POST /api/sessions/{id}/runs/{runId}/voice-usage). Never throws —
 * callers use the returned result to drive fallback/low-balance UX, but a
 * failed usage log must never interrupt the speech that already started.
 */
export async function logVoiceUsage(
  sessionId: string,
  sessionRunId: string,
  provider: VoiceProvider,
  characterCount: number,
  token: string | null,
): Promise<VoiceUsageResult> {
  if (characterCount <= 0) return { ok: true, insufficientCredits: false };

  try {
    const response = await fetch(
      config.getApiUrl(config.api.voice.usage(sessionId, sessionRunId)),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          provider,
          character_count: characterCount,
          idempotency_key: crypto.randomUUID(),
        }),
      },
    );

    if (response.status === 402) {
      return { ok: false, insufficientCredits: true };
    }
    if (!response.ok) {
      console.warn('Voice usage logging failed:', response.status);
      return { ok: false, insufficientCredits: false };
    }

    const data = await response.json();
    return {
      ok: true,
      insufficientCredits: false,
      creditsCharged: Number(data.credits_charged),
      newBalance: Number(data.new_balance),
    };
  } catch (err) {
    console.warn('Voice usage logging failed:', err);
    return { ok: false, insufficientCredits: false };
  }
}
