'use client';

import { attachAudioLevelMeter } from '@/lib/audioLevel';
import { buildEstimatedTimeline } from '@/lib/visemeTimeline';
import type { VisemeTimeline } from '@/lib/visemeTypes';
import type {
  ElevenLabsVoiceGender,
  ElevenLabsVoiceProfile,
} from '@/lib/elevenLabsSpeech';
import type { SpeechVoiceGender } from '@/lib/openaiSpeech';
import { playElevenLabsSpeech } from '@/lib/playElevenLabsAudio';

export interface PlayAvatarSpeechOptions {
  text: string;
  gender: ElevenLabsVoiceGender;
  voiceProfile?: ElevenLabsVoiceProfile;
  onSpeakingChange?: (speaking: boolean) => void;
  lowLatency?: boolean;
}

export interface PlayAvatarSpeechResult {
  stop: () => void;
  audio: HTMLAudioElement;
  timeline: VisemeTimeline;
  getAudioLevel: () => number;
  /** Which engine produced the audio. */
  engine: 'elevenlabs' | 'openai' | 'browser';
}

function waitForAudioMetadata(audio: HTMLAudioElement): Promise<number> {
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    return Promise.resolve(audio.duration);
  }
  return new Promise((resolve) => {
    const onMeta = (): void => {
      audio.removeEventListener('loadedmetadata', onMeta);
      resolve(audio.duration || 0);
    };
    audio.addEventListener('loadedmetadata', onMeta);
  });
}

async function synthesizeOpenAiSpeech(
  text: string,
  gender: SpeechVoiceGender,
): Promise<ArrayBuffer> {
  const response = await fetch('/api/speech/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, gender }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'OpenAI speech synthesis failed');
  }

  return response.arrayBuffer();
}

async function playBufferedSpeech(
  audioBuffer: ArrayBuffer,
  text: string,
  timeline: VisemeTimeline | null,
  onSpeakingChange?: (speaking: boolean) => void,
): Promise<PlayAvatarSpeechResult> {
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  const objectUrl = URL.createObjectURL(blob);
  const audio = new Audio(objectUrl);

  let resolvedTimeline = timeline;
  if (!resolvedTimeline || resolvedTimeline.keyframes.length === 0) {
    const duration = await waitForAudioMetadata(audio);
    resolvedTimeline = buildEstimatedTimeline(text, duration);
  }

  const meter = attachAudioLevelMeter(audio);

  const cleanup = (): void => {
    audio.pause();
    meter.dispose();
    URL.revokeObjectURL(objectUrl);
    onSpeakingChange?.(false);
  };

  audio.onplay = () => onSpeakingChange?.(true);
  audio.onended = cleanup;
  audio.onerror = cleanup;

  await audio.play();
  return {
    stop: cleanup,
    audio,
    timeline: resolvedTimeline,
    getAudioLevel: () => meter.getLevel(),
    engine: 'openai',
  };
}

/**
 * Prefer ElevenLabs (synced visemes), then OpenAI TTS (natural voice), then caller
 * should fall back to browser speech synthesis.
 */
export async function playAvatarSpeech(
  options: PlayAvatarSpeechOptions,
): Promise<PlayAvatarSpeechResult> {
  const { text, gender, voiceProfile = 'adult', onSpeakingChange, lowLatency = false } = options;

  try {
    const eleven = await playElevenLabsSpeech({
      text,
      gender,
      voiceProfile,
      onSpeakingChange,
      lowLatency,
    });
    return { ...eleven, engine: 'elevenlabs' };
  } catch (elevenLabsError) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[playAvatarSpeech] ElevenLabs unavailable, trying OpenAI TTS', elevenLabsError);
    }
    // Try OpenAI TTS next — still a real recorded-quality voice, not browser TTS.
  }

  const audioBuffer = await synthesizeOpenAiSpeech(text, gender);
  return playBufferedSpeech(audioBuffer, text, null, onSpeakingChange);
}
