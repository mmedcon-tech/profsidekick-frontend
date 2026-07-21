export type ElevenLabsVoiceGender = 'male' | 'female';
export type ElevenLabsVoiceProfile = 'adult' | 'kids';

export const ELEVENLABS_TTS_MODEL = 'eleven_multilingual_v2';
/** Faster model for live call mode — lower latency, still supports timestamps. */
export const ELEVENLABS_TTS_MODEL_FAST = 'eleven_turbo_v2_5';

const DEFAULT_VOICE_IDS: Record<ElevenLabsVoiceProfile, Record<ElevenLabsVoiceGender, string>> = {
  adult: {
    male: 'pNInz6obpgDQGcFmaJgB',
    female: 'EXAVITQu4vr4xnSDxMaL',
  },
  kids: {
    male: 'TxGEqnHWrfWFTfGW9XjX',
    female: 'MF3mGyEYCl7XYWbV9V6O',
  },
};

export interface ElevenLabsSpeechRequest {
  text: string;
  gender: ElevenLabsVoiceGender;
  voiceId?: string;
  voiceProfile?: ElevenLabsVoiceProfile;
}

export function pickElevenLabsVoiceId(
  gender: ElevenLabsVoiceGender,
  voiceProfile: ElevenLabsVoiceProfile = 'adult',
): string {
  const envKey =
    voiceProfile === 'kids'
      ? gender === 'male'
        ? process.env.ELEVENLABS_VOICE_ID_KIDS_MALE
        : process.env.ELEVENLABS_VOICE_ID_KIDS_FEMALE
      : gender === 'male'
        ? process.env.ELEVENLABS_VOICE_ID_MALE
        : process.env.ELEVENLABS_VOICE_ID_FEMALE;
  return envKey?.trim() || DEFAULT_VOICE_IDS[voiceProfile][gender];
}

export function buildElevenLabsSpeechBody({
  text,
  gender,
  voiceProfile = 'adult',
  modelId,
}: ElevenLabsSpeechRequest & { modelId?: string }): {
  text: string;
  model_id: string;
  voice_settings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
} {
  const isKids = voiceProfile === 'kids';
  return {
    text,
    model_id: modelId ?? ELEVENLABS_TTS_MODEL,
    voice_settings: {
      stability: isKids ? 0.58 : 0.45,
      similarity_boost: isKids ? 0.72 : 0.8,
      style: isKids ? 0.42 : 0.2,
      use_speaker_boost: true,
    },
  };
}

export function resolveElevenLabsVoiceId(
  gender: ElevenLabsVoiceGender,
  voiceId?: string,
  voiceProfile: ElevenLabsVoiceProfile = 'adult',
): string {
  return voiceId?.trim() || pickElevenLabsVoiceId(gender, voiceProfile);
}
