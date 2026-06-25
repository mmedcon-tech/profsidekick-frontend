'use client';

import type { ElevenLabsVoiceGender } from '@/lib/elevenLabsSpeech';

export interface PlayElevenLabsSpeechOptions {
  text: string;
  gender: ElevenLabsVoiceGender;
  onSpeakingChange?: (speaking: boolean) => void;
}

export async function synthesizeElevenLabsSpeech(
  text: string,
  gender: ElevenLabsVoiceGender,
): Promise<ArrayBuffer> {
  const response = await fetch('/api/tts/elevenlabs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, gender }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'ElevenLabs speech synthesis failed');
  }

  return response.arrayBuffer();
}

export async function playElevenLabsSpeech({
  text,
  gender,
  onSpeakingChange,
}: PlayElevenLabsSpeechOptions): Promise<() => void> {
  const audioBuffer = await synthesizeElevenLabsSpeech(text, gender);
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  const objectUrl = URL.createObjectURL(blob);
  const audio = new Audio(objectUrl);

  const cleanup = (): void => {
    audio.pause();
    URL.revokeObjectURL(objectUrl);
    onSpeakingChange?.(false);
  };

  audio.onplay = () => onSpeakingChange?.(true);
  audio.onended = cleanup;
  audio.onerror = cleanup;

  await audio.play();
  return cleanup;
}
