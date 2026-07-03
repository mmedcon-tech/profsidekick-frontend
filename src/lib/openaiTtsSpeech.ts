'use client';

import { buildEstimatedTimeline } from '@/lib/visemeTimeline';
import type { VisemeTimeline } from '@/lib/visemeTypes';
import type { SpeechVoiceGender } from '@/lib/openaiSpeech';

export interface PlayOpenAiSpeechOptions {
  text: string;
  /** Explicit OpenAI voice id resolved by the dual voice pipeline (e.g. "alloy"). */
  voiceId?: string;
  gender?: SpeechVoiceGender;
  onSpeakingChange?: (speaking: boolean) => void;
}

export interface PlayOpenAiSpeechResult {
  stop: () => void;
  audio: HTMLAudioElement;
  timeline: VisemeTimeline;
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

export async function synthesizeOpenAiTtsSpeech(
  text: string,
  voiceId?: string,
  gender: SpeechVoiceGender = 'female',
): Promise<ArrayBuffer> {
  const response = await fetch('/api/tts/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceId, gender }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'OpenAI speech synthesis failed');
  }

  return response.arrayBuffer();
}

export async function playOpenAiTtsSpeech({
  text,
  voiceId,
  gender = 'female',
  onSpeakingChange,
}: PlayOpenAiSpeechOptions): Promise<PlayOpenAiSpeechResult> {
  const audioBuffer = await synthesizeOpenAiTtsSpeech(text, voiceId, gender);
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  const objectUrl = URL.createObjectURL(blob);
  const audio = new Audio(objectUrl);

  // OpenAI's speech endpoint has no per-character timing API (unlike
  // ElevenLabs' with-timestamps mode), so the viseme timeline is always
  // estimated from text length + real audio duration.
  const duration = await waitForAudioMetadata(audio);
  const timeline = buildEstimatedTimeline(text, duration);

  const cleanup = (): void => {
    audio.pause();
    URL.revokeObjectURL(objectUrl);
    onSpeakingChange?.(false);
  };

  audio.onplay = () => onSpeakingChange?.(true);
  audio.onended = cleanup;
  audio.onerror = cleanup;

  await audio.play();
  return { stop: cleanup, audio, timeline };
}
