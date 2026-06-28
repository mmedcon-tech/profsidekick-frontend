/**
 * Maps a configured avatar voice id to a concrete speech profile.
 *
 * Publishers pick an OpenAI-style voice id (alloy, ash, …) in the avatar
 * configuration; the marketplace exposes realtime voice labels (cedar, marin).
 * The floating assistant speaks through the browser Web Speech API (and
 * ElevenLabs for Arabic), neither of which know those ids — so we translate the
 * id into the gender / pitch that actually drives voice selection. This is what
 * stops every avatar from sounding like the same default female voice.
 */

export type VoiceGender = 'male' | 'female';

export interface VoiceProfile {
  /** The configured voice id (normalised, lowercased). */
  id: string;
  gender: VoiceGender;
  /** SpeechSynthesis pitch (1 = default). */
  pitch: number;
  /** SpeechSynthesis rate (1 = default). */
  rate: number;
}

/**
 * Gender for every voice id we know about: OpenAI TTS (alloy…verse),
 * gpt-realtime (cedar, marin) and a few common extras. Unknown ids fall back to
 * the avatar's own gender hint.
 */
const GENDER_BY_VOICE: Record<string, VoiceGender> = {
  // female-leaning
  alloy: 'female',
  coral: 'female',
  sage: 'female',
  shimmer: 'female',
  nova: 'female',
  marin: 'female',
  breeze: 'female',
  juniper: 'female',
  // male-leaning
  ash: 'male',
  ballad: 'male',
  echo: 'male',
  onyx: 'male',
  verse: 'male',
  cedar: 'male',
  fable: 'male',
};

const FEMALE_PITCH = 1.08;
const MALE_PITCH = 0.92;

/**
 * Resolve a voice id (+ optional gender hint from the avatar) into a profile.
 * Never throws; always returns a usable profile.
 */
export function resolveVoiceProfile(
  voiceId?: string | null,
  fallbackGender: VoiceGender = 'female',
): VoiceProfile {
  const id = (voiceId ?? '').trim().toLowerCase();
  const gender = GENDER_BY_VOICE[id] ?? fallbackGender;
  return {
    id: id || (gender === 'male' ? 'cedar' : 'marin'),
    gender,
    pitch: gender === 'male' ? MALE_PITCH : FEMALE_PITCH,
    rate: 1,
  };
}

/** Best-effort gender for a voice id, ignoring any fallback. */
export function genderForVoice(voiceId?: string | null): VoiceGender | undefined {
  const id = (voiceId ?? '').trim().toLowerCase();
  return GENDER_BY_VOICE[id];
}
