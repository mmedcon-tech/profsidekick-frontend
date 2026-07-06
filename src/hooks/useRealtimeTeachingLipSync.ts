'use client';

import { useMemo } from 'react';
import { useAudioAmplitude } from '@/hooks/useAudioAmplitude';
import { useMediaStreamAmplitude } from '@/hooks/useMediaStreamAmplitude';

function getRemoteAudioStream(audioElement: HTMLAudioElement | null): MediaStream | null {
  const src = audioElement?.srcObject;
  if (src instanceof MediaStream) {
    return src;
  }
  return null;
}

/**
 * Mouth movement driven by realtime WebRTC audio output.
 * Prefers direct MediaStream analysis (Safari-safe); falls back to the audio element.
 */
export function useRealtimeTeachingLipSync(
  audioElement: HTMLAudioElement | null,
  isConnected: boolean,
): number {
  const remoteStream = useMemo(
    () => getRemoteAudioStream(audioElement),
    [audioElement, audioElement?.srcObject],
  );

  const active = Boolean(isConnected && audioElement);
  const streamAmplitude = useMediaStreamAmplitude(remoteStream, active && Boolean(remoteStream));
  const elementAmplitude = useAudioAmplitude(
    audioElement,
    active && !remoteStream,
  );

  return Math.max(streamAmplitude, elementAmplitude);
}
