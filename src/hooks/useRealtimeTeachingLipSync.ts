'use client';

import { useAudioAmplitude } from '@/hooks/useAudioAmplitude';

/**
 * Subtle mouth movement driven by the realtime WebRTC audio output.
 * Tracks the audio element while connected — not gated on isAISpeaking, which
 * can lag behind actual playback and makes lips snap shut early.
 */
export function useRealtimeTeachingLipSync(
  audioElement: HTMLAudioElement | null,
  isConnected: boolean,
): number {
  return useAudioAmplitude(audioElement, Boolean(audioElement && isConnected));
}
