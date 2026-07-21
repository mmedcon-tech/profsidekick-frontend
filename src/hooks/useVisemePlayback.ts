'use client';

import { useEffect, useRef } from 'react';
import { inferLipSyncRigStyle, sampleVisemeTimeline } from '@/lib/visemeTimeline';
import type { LipSyncHints } from '@/lib/glbLipSync';
import type { VisemeMorphWeights, VisemeTimeline } from '@/lib/visemeTypes';

/**
 * Tracks playback time and samples the viseme timeline each animation frame.
 * Pass a `clock` that returns elapsed seconds (from audio.currentTime or a
 * speech-synthesis timer). Returns a ref to avoid React re-renders.
 */
export function useVisemePlayback(
  clock: () => number,
  timeline: VisemeTimeline | null,
  active: boolean,
  lipSyncHints?: LipSyncHints,
): React.RefObject<VisemeMorphWeights | null> {
  const ref = useRef<VisemeMorphWeights | null>(null);

  useEffect(() => {
    if (!timeline || !active) {
      ref.current = null;
      return;
    }

    const rigStyle = inferLipSyncRigStyle(lipSyncHints?.morphTargets);
    const gain = lipSyncHints?.mouthOpenGain ?? 1;
    const blendHold = lipSyncHints?.visemeBlendHold;
    let rafId = 0;

    const tick = (): void => {
      const t = clock();
      ref.current = sampleVisemeTimeline(timeline, t, rigStyle, gain, blendHold);
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      ref.current = null;
    };
  }, [clock, timeline, active, lipSyncHints]);

  return ref;
}
