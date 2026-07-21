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

/** Assistant call mode — longer holds so mouths read as speech, not vibration. */
const ASSISTANT_MIN_KEYFRAME_DURATION = 0.14;

const VOWEL_VISEMES = new Set<VisemeId>(['aa', 'E', 'I', 'O', 'U']);
const PLOSIVE_ONSET = new Set<VisemeId>(['PP', 'FF', 'DD', 'SS', 'CH', 'TH']);

function charToVisemeId(ch: string): VisemeId {
  if (!ch.trim() || /[.,!?;:'"()[\]{}\-]/.test(ch)) return 'sil';
  return singleCharToViseme(ch);
}

function dominantVisemeForText(text: string): VisemeId {
  const clean = text.trim();
  if (!clean) return 'sil';
  const visemes = textToVisemeSequence(clean);
  const vowel = visemes.find((v) => VOWEL_VISEMES.has(v));
  if (vowel) return vowel;
  const consonant = visemes.find((v) => v !== 'sil');
  return consonant ?? 'sil';
}

function firstPlosiveViseme(text: string): VisemeId | null {
  const visemes = textToVisemeSequence(text.trim()).filter((v) => v !== 'sil');
  const plosive = visemes.find((v) => PLOSIVE_ONSET.has(v));
  return plosive ?? null;
}

/** Open → vowel → close pattern so simple rigs (Salama) don't stay gaped. */
function appendSpokenWordKeyframes(
  keyframes: VisemeKeyframe[],
  word: { text: string; start: number; end: number },
): void {
  const duration = word.end - word.start;
  if (duration <= 0.04) return;

  const nucleus = dominantVisemeForText(word.text);
  const onset = firstPlosiveViseme(word.text);
  const closeIn = Math.min(0.07, duration * 0.2);
  const closeOut = Math.min(0.08, duration * 0.22);
  const coreStart = word.start + (onset && onset !== nucleus ? 0 : closeIn);
  const coreEnd = word.end - closeOut;
  const coreDur = Math.max(0.05, coreEnd - coreStart);

  if (onset && onset !== nucleus && duration > 0.16) {
    const onsetDur = Math.min(0.08, duration * 0.18);
    keyframes.push({ time: word.start, viseme: onset, duration: onsetDur });
    keyframes.push({
      time: word.start + onsetDur,
      viseme: nucleus,
      duration: Math.max(0.05, coreEnd - (word.start + onsetDur)),
    });
  } else {
    if (closeIn > 0.025) {
      keyframes.push({ time: word.start, viseme: 'nn', duration: closeIn });
    }
    keyframes.push({ time: coreStart, viseme: nucleus, duration: coreDur });
  }

  if (closeOut > 0.025 && coreEnd < word.end) {
    keyframes.push({ time: coreEnd, viseme: 'sil', duration: word.end - coreEnd });
  }
}

function appendWordGapSilence(
  keyframes: VisemeKeyframe[],
  gapStart: number,
  gapEnd: number,
): void {
  const gap = gapEnd - gapStart;
  if (gap < 0.03) return;
  keyframes.push({ time: gapStart, viseme: 'sil', duration: gap });
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

function absorbShortKeyframes(
  keyframes: VisemeKeyframe[],
  minDuration = MIN_KEYFRAME_DURATION,
): VisemeKeyframe[] {
  if (keyframes.length <= 1) return keyframes;
  const out: VisemeKeyframe[] = [];

  for (const kf of keyframes) {
    if (kf.duration >= minDuration || kf.viseme === 'sil') {
      out.push({ ...kf });
      continue;
    }
    const prev = out[out.length - 1];
    if (prev) {
      prev.duration = kf.time + kf.duration - prev.time;
    } else {
      out.push({ ...kf });
    }
  }

  return out;
}

function collapseBriefConsonants(keyframes: VisemeKeyframe[]): VisemeKeyframe[] {
  const out: VisemeKeyframe[] = [];

  for (let i = 0; i < keyframes.length; i += 1) {
    const kf = keyframes[i];
    const next = keyframes[i + 1];
    const prev = out[out.length - 1];
    const isConsonant = !VOWEL_VISEMES.has(kf.viseme) && kf.viseme !== 'sil';

    if (
      isConsonant &&
      kf.duration < 0.11 &&
      prev &&
      VOWEL_VISEMES.has(prev.viseme) &&
      next &&
      VOWEL_VISEMES.has(next.viseme)
    ) {
      prev.duration = kf.time + kf.duration - prev.time;
      continue;
    }

    if (isConsonant && kf.duration < 0.075 && prev) {
      prev.duration = kf.time + kf.duration - prev.time;
      continue;
    }

    out.push({ ...kf });
  }

  return out;
}

export function refineVisemeTimeline(timeline: VisemeTimeline): VisemeTimeline {
  if (!timeline.keyframes.length) return timeline;

  let keyframes = mergeAdjacentKeyframes([...timeline.keyframes]);
  // Keep short silence gaps — they close Salama's mouth between words.
  keyframes = absorbShortKeyframes(keyframes, ASSISTANT_MIN_KEYFRAME_DURATION * 0.55);
  keyframes = collapseBriefConsonants(keyframes);

  return { keyframes, duration: timeline.duration };
}

/** Per-character timeline (precise mode / tests). */
export function buildCharacterTimelineFromAlignment(
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

/** Word-scale timeline — one or two mouth shapes per word instead of per letter. */
export function buildWordTimelineFromAlignment(
  alignment: ElevenLabsCharacterAlignment,
): VisemeTimeline {
  const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } =
    alignment;

  interface WordSpan {
    text: string;
    start: number;
    end: number;
  }

  const words: WordSpan[] = [];
  let wordStartIdx = -1;
  let wordText = '';

  const flushWord = (endIdx: number): void => {
    if (!wordText.trim() || wordStartIdx < 0) return;
    words.push({
      text: wordText,
      start: starts[wordStartIdx],
      end: ends[endIdx],
    });
    wordText = '';
    wordStartIdx = -1;
  };

  for (let i = 0; i < characters.length; i += 1) {
    const ch = characters[i];
    if (!ch.trim()) {
      flushWord(i - 1);
      continue;
    }
    if (wordStartIdx < 0) wordStartIdx = i;
    wordText += ch;
  }
  if (wordText && wordStartIdx >= 0) {
    flushWord(characters.length - 1);
  }

  if (words.length === 0) {
    return refineVisemeTimeline(buildCharacterTimelineFromAlignment(alignment));
  }

  const keyframes: VisemeKeyframe[] = [];
  for (let w = 0; w < words.length; w += 1) {
    const word = words[w];
    appendSpokenWordKeyframes(keyframes, word);
    const next = words[w + 1];
    if (next) {
      appendWordGapSilence(keyframes, word.end, next.start);
    }
  }

  const duration = ends.at(-1) ?? 0;
  return refineVisemeTimeline({ keyframes, duration });
}

/** Build a viseme timeline from ElevenLabs alignment (word-scale for natural speech). */
export function buildTimelineFromAlignment(
  alignment: ElevenLabsCharacterAlignment,
): VisemeTimeline {
  return buildWordTimelineFromAlignment(alignment);
}

/** Estimate a viseme timeline when only text and total audio duration are known. */
export function buildEstimatedTimeline(text: string, durationSeconds: number): VisemeTimeline {
  const words = text.split(/\s+/).filter((w) => w.trim().length > 0);
  if (words.length === 0 || durationSeconds <= 0) {
    return { keyframes: [], duration: durationSeconds };
  }

  const usable = durationSeconds * 0.92;
  const startPad = durationSeconds * 0.02;
  const gapBudget = usable * 0.06;
  const speechBudget = usable - gapBudget;
  const perWord = speechBudget / words.length;
  const perGap = words.length > 1 ? gapBudget / (words.length - 1) : 0;
  let t = startPad;

  const keyframes: VisemeKeyframe[] = [];
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const wordStart = t;
    const wordEnd = wordStart + perWord;
    appendSpokenWordKeyframes(keyframes, {
      text: word,
      start: wordStart,
      end: wordEnd,
    });
    t = wordEnd;
    if (i < words.length - 1 && perGap > 0.02) {
      appendWordGapSilence(keyframes, t, t + perGap);
      t += perGap;
    }
  }

  return refineVisemeTimeline({ keyframes, duration: durationSeconds });
}

function defaultBlendHold(rigStyle: LipSyncRigStyle): number {
  switch (rigStyle) {
    case 'simple':
      return 0.72;
    case 'arkit':
      return 0.78;
    default:
      return 0.72;
  }
}

export function sampleVisemeTimeline(
  timeline: VisemeTimeline,
  timeSeconds: number,
  rigStyle: LipSyncRigStyle,
  mouthOpenGain = 1,
  blendHold?: number,
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

  const hold = blendHold ?? defaultBlendHold(rigStyle);
  const blendWindow = Math.min(
    rigStyle === 'simple' ? 0.1 : 0.09,
    current.duration * Math.max(0.08, 1 - hold),
  );
  const blendStart = current.time + current.duration - blendWindow;
  if (blendWindow <= 0 || timeSeconds < blendStart) return w1;

  const w2 = visemeToMorphWeights(next.viseme, rigStyle, mouthOpenGain);
  const raw = (timeSeconds - blendStart) / blendWindow;
  const blend = raw * raw * (3 - 2 * raw);
  return lerpMorphWeights(w1, w2, blend);
}

export { inferLipSyncRigStyle };
