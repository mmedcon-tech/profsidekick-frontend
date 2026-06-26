'use client';

import { buildEstimatedTimeline, buildTimelineFromAlignment } from '@/lib/visemeTimeline';
import type { ElevenLabsCharacterAlignment, VisemeTimeline } from '@/lib/visemeTypes';
import type {
  ElevenLabsVoiceGender,
  ElevenLabsVoiceProfile,
} from '@/lib/elevenLabsSpeech';

export interface PlayElevenLabsSpeechOptions {
  text: string;
  gender: ElevenLabsVoiceGender;
  voiceProfile?: ElevenLabsVoiceProfile;
  onSpeakingChange?: (speaking: boolean) => void;
}

export interface PlayElevenLabsSpeechResult {
  stop: () => void;
  audio: HTMLAudioElement;
  timeline: VisemeTimeline;
}

interface ElevenLabsTimestampResponse {
  audio_base64: string;
  alignment?: ElevenLabsCharacterAlignment;
  normalized_alignment?: ElevenLabsCharacterAlignment;
}

function decodeBase64Audio(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
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

export async function synthesizeElevenLabsSpeech(
  text: string,
  gender: ElevenLabsVoiceGender,
  voiceProfile: ElevenLabsVoiceProfile = 'adult',
): Promise<{ audioBuffer: ArrayBuffer; timeline: VisemeTimeline | null }> {
  const response = await fetch('/api/tts/elevenlabs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, gender, voiceProfile, withTimestamps: true }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'ElevenLabs speech synthesis failed');
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const payload = (await response.json()) as ElevenLabsTimestampResponse;
    const alignment = payload.normalized_alignment ?? payload.alignment;
    const timeline = alignment ? buildTimelineFromAlignment(alignment) : null;
    return { audioBuffer: decodeBase64Audio(payload.audio_base64), timeline };
  }

  const audioBuffer = await response.arrayBuffer();
  return { audioBuffer, timeline: null };
}

export async function playElevenLabsSpeech({
  text,
  gender,
  voiceProfile = 'adult',
  onSpeakingChange,
}: PlayElevenLabsSpeechOptions): Promise<PlayElevenLabsSpeechResult> {
  const { audioBuffer, timeline: syncedTimeline } = await synthesizeElevenLabsSpeech(
    text,
    gender,
    voiceProfile,
  );
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  const objectUrl = URL.createObjectURL(blob);
  const audio = new Audio(objectUrl);

  let timeline = syncedTimeline;
  if (!timeline || timeline.keyframes.length === 0) {
    const duration = await waitForAudioMetadata(audio);
    timeline = buildEstimatedTimeline(text, duration);
  }

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
