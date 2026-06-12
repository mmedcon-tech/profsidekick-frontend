'use client';

import { useEffect, useState } from 'react';

/** Oscillating 0–1 amplitude for GLB lip-sync demos when no audio element is available. */
export function useSimulatedAmplitude(enabled: boolean): number {
  const [amplitude, setAmplitude] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setAmplitude(0);
      return;
    }

    let rafId = 0;
    let phase = 0;

    const tick = (): void => {
      phase += 0.14;
      const value = (Math.sin(phase * 9) * 0.45 + 0.45) * (0.55 + Math.sin(phase * 2.1) * 0.25);
      setAmplitude(Math.max(0, Math.min(1, value)));
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [enabled]);

  return amplitude;
}
