import {
  digraphToViseme,
  inferLipSyncRigStyle,
  lerpMorphWeights,
  singleCharToViseme,
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

/** Shortest a keyframe may last; quick consonants below this fold into neighbours. */
const MIN_KEYFRAME_DURATION = 0.045;

function charToVisemeId(ch: string): VisemeId {
  if (!ch.trim() || /[.,!?;:'"()[\]{}\-]/.test(ch)) return 'sil';
  return singleCharToViseme(ch);
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

/**
 * Fold keyframes shorter than {@link MIN_KEYFRAME_DURATION} into the neighbour
 * that already carries a visible mouth shape. Vowel shapes win over the brief
 * consonant transitions between them, which is what makes speech read as words
 * instead of a rapid flutter of half-formed shapes.
 */
function absorbShortKeyframes(keyframes: VisemeKeyframe[]): VisemeKeyframe[] {
  if (keyframes.length <= 1) return keyframes;
  const out: VisemeKeyframe[] = [];

  for (const kf of keyframes) {
    if (kf.duration >= MIN_KEYFRAME_DURATION || kf.viseme === 'sil') {
      out.push({ ...kf });
      continue;
    }
    // Too brief to register — extend the previous shape over this slot.
    const prev = out[out.length - 1];
    if (prev) {
      prev.duration = kf.time + kf.duration - prev.time;
    } else {
      out.push({ ...kf });
    }
  }

  return out;
}

/** Build a viseme timeline from ElevenLabs per-character alignment data. */
export function buildTimelineFromAlignment(
  alignment: ElevenLabsCharacterAlignment,
): VisemeTimeline {
  const keyframes: VisemeKeyframe[] = [];
  const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } =
    alignment;

  let i = 0;
  while (i < characters.length) {
    const ch = characters[i];
    const next = characters[i + 1] ?? '';
    const start = starts[i];

    // Detect two-character digraphs (th, sh, ch, ng, oo, …) so a pair like "th"
    // becomes a single correct mouth shape instead of a t→h gape.
    let viseme: VisemeId;
    let end: number;
    let consumed = 1;
    const digraph = ch.trim() && next.trim() ? digraphToViseme(ch + next) : null;
    if (digraph) {
      viseme = digraph;
      end = ends[i + 1];
      consumed = 2;
    } else {
      viseme = charToVisemeId(ch);
      end = ends[i];
    }

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
    i += consumed;
  }

  const duration = ends.at(-1) ?? 0;
  return { keyframes: absorbShortKeyframes(mergeAdjacentKeyframes(keyframes)), duration };
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

  // Blend across a generous tail of the current keyframe so the mouth glides
  // into the next shape (coarticulation) instead of snapping between visemes.
  const blendWindow = Math.min(0.09, current.duration * 0.6);
  const blendStart = current.time + current.duration - blendWindow;
  if (timeSeconds < blendStart) return w1;

  const w2 = visemeToMorphWeights(next.viseme, rigStyle, mouthOpenGain);
  const raw = (timeSeconds - blendStart) / blendWindow;
  // Smoothstep easing keeps the transition soft at both ends.
  const blend = raw * raw * (3 - 2 * raw);
  return lerpMorphWeights(w1, w2, blend);
}

export { inferLipSyncRigStyle };
