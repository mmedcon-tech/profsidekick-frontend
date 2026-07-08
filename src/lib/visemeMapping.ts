import type { LipSyncRigStyle, VisemeId, VisemeMorphWeights } from './visemeTypes';

const DIGRAPH_VISEMES: Record<string, VisemeId> = {
  th: 'TH',
  sh: 'SS',
  ch: 'CH',
  ng: 'nn',
  oo: 'O',
  ee: 'E',
  ai: 'aa',
  ou: 'O',
  ow: 'O',
  ar: 'aa',
  er: 'RR',
  or: 'O',
};

function charToViseme(ch: string): VisemeId {
  switch (ch) {
    case 'a':
      return 'aa';
    case 'e':
      return 'E';
    case 'i':
    case 'y':
      return 'I';
    case 'o':
      return 'O';
    case 'u':
    case 'w':
      return 'U';
    case 'm':
    case 'b':
    case 'p':
      return 'PP';
    case 'f':
    case 'v':
      return 'FF';
    case 's':
    case 'z':
      return 'SS';
    case 'c':
      return 'SS';
    case 'r':
      return 'RR';
    case 'n':
    case 'l':
      return 'nn';
    case 'd':
    case 't':
    case 'g':
    case 'k':
    case 'j':
    case 'q':
    case 'x':
      return 'DD';
    // 'h' is breathy with no lip shape of its own — keep it a soft, near-neutral
    // open so it doesn't read as a wide "aa" gape (a common lip-sync artefact).
    case 'h':
      return 'nn';
    case ' ':
    case '.':
    case ',':
    case '!':
    case '?':
    case ';':
    case ':':
    case '\n':
      return 'sil';
    default:
      // Unknown/foreign characters: a mild neutral shape, never a wide gape.
      return 'nn';
  }
}

/** Resolve a two-character digraph (e.g. "th", "sh", "oo") to a viseme, or null. */
export function digraphToViseme(twoChars: string): VisemeId | null {
  return DIGRAPH_VISEMES[twoChars.toLowerCase()] ?? null;
}

/** Map a single character to a viseme (exposed for per-character alignment). */
export function singleCharToViseme(ch: string): VisemeId {
  return charToViseme(ch.toLowerCase());
}

/** Convert spoken text into a viseme sequence (English-oriented rules). */
export function textToVisemeSequence(text: string): VisemeId[] {
  const lower = text.toLowerCase();
  const result: VisemeId[] = [];
  let i = 0;

  while (i < lower.length) {
    let matched = false;
    for (const digraph of Object.keys(DIGRAPH_VISEMES)) {
      if (lower.startsWith(digraph, i)) {
        result.push(DIGRAPH_VISEMES[digraph]);
        i += digraph.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result.push(charToViseme(lower[i]));
      i += 1;
    }
  }

  return result;
}

const ARKIT_VISEME_SHAPES: Record<VisemeId, VisemeMorphWeights> = {
  sil: { mouthClose: 0.35, jawOpen: 0.02, mouthOpen: 0.02 },
  aa: { viseme_aa: 0.92, mouthOpen: 0.55, jawOpen: 0.45 },
  E: { viseme_E: 0.88, mouthOpen: 0.35, mouthSmile: 0.2 },
  I: { viseme_I: 0.85, viseme_E: 0.35, mouthSmile: 0.35 },
  O: { viseme_O: 0.9, mouthOpen: 0.4, mouthFunnel: 0.25 },
  U: { viseme_U: 0.88, mouthFunnel: 0.45, mouthPucker: 0.35 },
  PP: { viseme_PP: 0.95, mouthClose: 0.7, jawOpen: 0.04 },
  FF: { viseme_FF: 0.9, mouthOpen: 0.15 },
  TH: { viseme_TH: 0.88, mouthOpen: 0.25 },
  DD: { viseme_DD: 0.85, mouthOpen: 0.3 },
  SS: { viseme_SS: 0.88, mouthOpen: 0.18 },
  CH: { viseme_CH: 0.88, mouthOpen: 0.28 },
  nn: { viseme_nn: 0.85, mouthOpen: 0.2 },
  RR: { viseme_RR: 0.85, mouthOpen: 0.25 },
};

const ROBLOX_VISEME_SHAPES: Record<VisemeId, VisemeMorphWeights> = {
  sil: { jawOpen: 0.02, mouthPucker: 0.02 },
  aa: { jawOpen: 0.95, mouthFunnel: 0.08 },
  E: { jawOpen: 0.42, mouthSmileLeft: 0.72 },
  I: { jawOpen: 0.35, mouthSmileLeft: 0.85 },
  O: { jawOpen: 0.72, mouthFunnel: 0.55 },
  U: { jawOpen: 0.5, mouthFunnel: 0.7, mouthPucker: 0.55 },
  PP: { jawOpen: 0.06, mouthPucker: 0.92 },
  FF: { jawOpen: 0.28, mouthFunnel: 0.65 },
  TH: { jawOpen: 0.32, mouthFunnel: 0.35 },
  DD: { jawOpen: 0.38, mouthSmileLeft: 0.15 },
  SS: { jawOpen: 0.22, mouthSmileLeft: 0.25 },
  CH: { jawOpen: 0.4, mouthFunnel: 0.4 },
  nn: { jawOpen: 0.25, mouthSmileLeft: 0.2 },
  RR: { jawOpen: 0.3, mouthFunnel: 0.2 },
};

export function visemeToMorphWeights(
  viseme: VisemeId,
  rigStyle: LipSyncRigStyle,
  mouthOpenGain = 1,
): VisemeMorphWeights {
  const base = rigStyle === 'arkit' ? ARKIT_VISEME_SHAPES[viseme] : ROBLOX_VISEME_SHAPES[viseme];
  if (mouthOpenGain === 1) return { ...base };

  const scaled: VisemeMorphWeights = {};
  for (const [key, value] of Object.entries(base)) {
    if (/jawopen|mouthopen|viseme_/i.test(key)) {
      scaled[key] = Math.min(1, value * mouthOpenGain);
    } else {
      scaled[key] = value;
    }
  }
  return scaled;
}

export function lerpMorphWeights(
  a: VisemeMorphWeights,
  b: VisemeMorphWeights,
  t: number,
): VisemeMorphWeights {
  const blend = Math.max(0, Math.min(1, t));
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: VisemeMorphWeights = {};
  for (const key of keys) {
    const av = a[key] ?? 0;
    const bv = b[key] ?? 0;
    out[key] = av + (bv - av) * blend;
  }
  return out;
}

export function inferLipSyncRigStyle(morphTargets: string[] | undefined): LipSyncRigStyle {
  if (!morphTargets?.length) return 'arkit';
  return morphTargets.some((name) => /viseme_/i.test(name)) ? 'arkit' : 'roblox';
}
