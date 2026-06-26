import {
  inferLipSyncRigStyle,
  lerpMorphWeights,
  textToVisemeSequence,
  visemeToMorphWeights,
} from './visemeMapping';
import type {
  ElevenLabsCharacterAlignment,
  LipSyncRigStyle,
  VisemeId,
  VisemeKeyframe,
  VisemeMorphWeights,
  VisemeTimeline,
} from './visemeTypes';

function charToVisemeId(ch: string): VisemeId {
  if (!ch.trim() || /[.,!?;:'"()[\]{}\-]/.test(ch)) return 'sil';
  return textToVisemeSequence(ch)[0] ?? 'aa';
}

function mergeAdjacentKeyframes(keyframes: VisemeKeyframe[]): VisemeKeyframe[] {
  const merged: VisemeKeyframe[] = [];
  for (const kf of keyframes) {
    const last = merged[merged.length - 1];
    if (last && last.viseme === kf.viseme && kf.time - (last.time + last.duration) < 0.05) {
      last.duration = Math.max(last.duration, kf.time + kf.duration - last.time);
    } else {
      merged.push({ ...kf });
    }
  }
  return merged;
}

/** Build a viseme timeline from ElevenLabs per-character alignment data. */
export function buildTimelineFromAlignment(
  alignment: ElevenLabsCharacterAlignment,
): VisemeTimeline {
  const keyframes: VisemeKeyframe[] = [];

  for (let i = 0; i < alignment.characters.length; i += 1) {
    const ch = alignment.characters[i];
    const start = alignment.character_start_times_seconds[i];
    const end = alignment.character_end_times_seconds[i];
    const viseme = charToVisemeId(ch);
    const last = keyframes[keyframes.length - 1];

    if (last && last.viseme === viseme && start - (last.time + last.duration) < 0.05) {
      last.duration = Math.max(last.duration, end - last.time);
    } else {
      keyframes.push({
        time: start,
        viseme,
        duration: Math.max(0.025, end - start),
      });
    }
  }

  const duration = alignment.character_end_times_seconds.at(-1) ?? 0;
  return { keyframes: mergeAdjacentKeyframes(keyframes), duration };
}

/** Estimate a viseme timeline when only text and total audio duration are known. */
export function buildEstimatedTimeline(text: string, durationSeconds: number): VisemeTimeline {
  const visemes = textToVisemeSequence(text).filter(
    (v, i, arr) => i === 0 || v !== arr[i - 1],
  );
  if (visemes.length === 0 || durationSeconds <= 0) {
    return { keyframes: [], duration: durationSeconds };
  }

  const weights = visemes.map((v) => (v === 'sil' ? 0.4 : 1));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const usable = durationSeconds * 0.94;
  let t = durationSeconds * 0.02;

  const keyframes: VisemeKeyframe[] = visemes.map((viseme, i) => {
    const duration = (usable * weights[i]) / totalWeight;
    const keyframe: VisemeKeyframe = { time: t, viseme, duration };
    t += duration;
    return keyframe;
  });

  return { keyframes, duration: durationSeconds };
}

/** Sample morph weights for the viseme active at `timeSeconds`. */
export function sampleVisemeTimeline(
  timeline: VisemeTimeline,
  timeSeconds: number,
  rigStyle: LipSyncRigStyle,
  mouthOpenGain = 1,
): VisemeMorphWeights {
  if (!timeline.keyframes.length || timeSeconds < 0) {
    return visemeToMorphWeights('sil', rigStyle, mouthOpenGain);
  }
  if (timeSeconds >= timeline.duration) {
    return visemeToMorphWeights('sil', rigStyle, mouthOpenGain);
  }

  let idx = timeline.keyframes.findIndex(
    (kf) => timeSeconds >= kf.time && timeSeconds < kf.time + kf.duration,
  );
  if (idx < 0) idx = timeline.keyframes.length - 1;

  const current = timeline.keyframes[idx];
  const next = timeline.keyframes[idx + 1];
  const w1 = visemeToMorphWeights(current.viseme, rigStyle, mouthOpenGain);

  if (!next) return w1;

  const blendWindow = Math.min(0.06, current.duration * 0.42);
  const blendStart = current.time + current.duration - blendWindow;
  if (timeSeconds < blendStart) return w1;

  const w2 = visemeToMorphWeights(next.viseme, rigStyle, mouthOpenGain);
  const blend = (timeSeconds - blendStart) / blendWindow;
  return lerpMorphWeights(w1, w2, blend);
}

export { inferLipSyncRigStyle };
