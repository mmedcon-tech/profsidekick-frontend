import { playElevenLabsSpeech } from '@/lib/playElevenLabsAudio';
import { playOpenAiTtsSpeech } from '@/lib/openaiTtsSpeech';
import type { SpeechDispatch } from '@/lib/speechDispatch';
import type { VoiceProvider } from '@/types/types';

export type VoiceFallbackReason = 'platform_unavailable';

export interface SynthesizeResult {
  stop: () => void;
  audio: HTMLAudioElement;
  /** The provider that actually produced audio — always bill/report this,
   * never `dispatch.provider`, since a fallback can change it mid-call. */
  providerUsed: VoiceProvider;
  fallbackReason?: VoiceFallbackReason;
}

/**
 * Synthesize an assistant turn for the dispatched provider/voice.
 *
 * ElevenLabs is a single shared platform account — subscribers never touch
 * it directly, so ANY failure synthesizing through it (quota, auth, network)
 * is a platform-side problem, never the subscriber's own credit balance
 * (that's a completely separate signal from billing_service, surfaced via
 * logVoiceUsage's `insufficientCredits`). On such a failure this retries
 * immediately via OpenAI TTS so the turn is never silently dropped, and
 * reports the fallback so the caller can bill the *actual* provider used and
 * show a persistent notification.
 */
export async function synthesizeAssistantSpeech(
  text: string,
  dispatch: SpeechDispatch,
  onSpeakingChange: (speaking: boolean) => void,
): Promise<SynthesizeResult> {
  if (dispatch.provider === 'openai') {
    const { stop, audio } = await playOpenAiTtsSpeech({
      text,
      voiceId: dispatch.voiceId,
      gender: dispatch.gender,
      onSpeakingChange,
    });
    return { stop, audio, providerUsed: 'openai' };
  }

  try {
    const { stop, audio } = await playElevenLabsSpeech({
      text,
      gender: dispatch.gender,
      voiceProfile: dispatch.voiceProfile,
      voiceId: dispatch.voiceId,
      onSpeakingChange,
    });
    return { stop, audio, providerUsed: 'elevenlabs' };
  } catch (err) {
    console.warn('ElevenLabs synthesis failed — falling back to OpenAI TTS:', err);
    const { stop, audio } = await playOpenAiTtsSpeech({
      text,
      gender: dispatch.gender,
      onSpeakingChange,
    });
    return { stop, audio, providerUsed: 'openai', fallbackReason: 'platform_unavailable' };
  }
}
