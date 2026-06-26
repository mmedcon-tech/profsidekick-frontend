/** Oculus / ARKit-style viseme ids used across adult and kids rigs. */
export type VisemeId =
  | 'sil'
  | 'aa'
  | 'E'
  | 'I'
  | 'O'
  | 'U'
  | 'PP'
  | 'FF'
  | 'TH'
  | 'DD'
  | 'SS'
  | 'CH'
  | 'nn'
  | 'RR';

export type LipSyncRigStyle = 'arkit' | 'roblox';

export interface VisemeKeyframe {
  time: number;
  viseme: VisemeId;
  duration: number;
}

export interface VisemeTimeline {
  keyframes: VisemeKeyframe[];
  duration: number;
}

/** Morph-target name → influence (0–1). */
export type VisemeMorphWeights = Record<string, number>;

export interface ElevenLabsCharacterAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}
