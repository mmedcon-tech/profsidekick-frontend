'use client';

import { useEffect, useState } from 'react';
import { computeNormalizedAmplitude } from '@/lib/audioAmplitude';

// Cache to prevent "already connected" errors
const audioCache = new WeakMap<HTMLAudioElement, { ctx: AudioContext; source: MediaElementAudioSourceNode; analyser: AnalyserNode }>();

export function useAudioAmplitude(
  audioElement: HTMLAudioElement | null,
  enabled: boolean,
): number {
  const [amplitude, setAmplitude] = useState(0);

  useEffect(() => {
    if (!audioElement || !enabled || typeof window === 'undefined') {
      setAmplitude(0);
      return;
    }

    let rafId = 0;
    let closed = false;

    let cached = audioCache.get(audioElement);
    if (!cached) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

        const ctx = new AudioCtx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.42;

        const source = ctx.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(ctx.destination);

        cached = { ctx, source, analyser };
        audioCache.set(audioElement, cached);
      } catch (err) {
        console.warn("Error initializing AudioContext for amplitude:", err);
        return;
      }
    }

    const { ctx, analyser } = cached;
    const buffer = new Uint8Array(analyser.frequencyBinCount);

    const tick = (): void => {
      if (closed) return;
      analyser.getByteFrequencyData(buffer);
      setAmplitude(computeNormalizedAmplitude(buffer));
      rafId = window.requestAnimationFrame(tick);
    };

    void ctx.resume().then(() => {
      if (!closed) rafId = window.requestAnimationFrame(tick);
    });

    return () => {
      closed = true;
      window.cancelAnimationFrame(rafId);
      setAmplitude(0);
      // We purposefully DO NOT close the ctx or disconnect the source 
      // so it can be reused if the component remounts with the same audioElement
    };
  }, [audioElement, enabled]);

  return amplitude;
}
