'use client';

import { useEffect, useState } from 'react';
import { computeWaveformAmplitude } from '@/lib/audioAmplitude';

interface StreamAnalyserCache {
  ctx: AudioContext;
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
}

const streamCache = new WeakMap<MediaStream, StreamAnalyserCache>();

/**
 * Analyse a WebRTC MediaStream directly (more reliable than HTMLAudioElement on Safari).
 */
export function useMediaStreamAmplitude(
  stream: MediaStream | null,
  enabled: boolean,
): number {
  const [amplitude, setAmplitude] = useState(0);

  useEffect(() => {
    if (!stream || !enabled || typeof window === 'undefined') {
      setAmplitude(0);
      return;
    }

    let rafId = 0;
    let closed = false;

    let cached = streamCache.get(stream);
    if (!cached) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

        const ctx = new AudioCtx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.35;

        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        cached = { ctx, source, analyser };
        streamCache.set(stream, cached);
      } catch (err) {
        console.warn('Error initializing MediaStream analyser for lip sync:', err);
        return;
      }
    }

    const { ctx, analyser } = cached;
    const buffer = new Uint8Array(analyser.fftSize);

    const tick = (): void => {
      if (closed) return;
      analyser.getByteTimeDomainData(buffer);
      setAmplitude(computeWaveformAmplitude(buffer));
      rafId = window.requestAnimationFrame(tick);
    };

    void ctx.resume().then(() => {
      if (!closed) rafId = window.requestAnimationFrame(tick);
    });

    return () => {
      closed = true;
      window.cancelAnimationFrame(rafId);
      setAmplitude(0);
    };
  }, [stream, enabled]);

  return amplitude;
}
