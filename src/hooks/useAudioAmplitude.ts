'use client';

import { useEffect, useState } from 'react';
import { computeNormalizedAmplitude } from '@/lib/audioAmplitude';

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

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    const ctx = new AudioCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.75;

    const source = ctx.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(ctx.destination);

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
      source.disconnect();
      analyser.disconnect();
      void ctx.close();
      setAmplitude(0);
    };
  }, [audioElement, enabled]);

  return amplitude;
}
