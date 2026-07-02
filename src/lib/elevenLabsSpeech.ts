export type ElevenLabsVoiceGender = 'male' | 'female';

export const ELEVENLABS_TTS_MODEL = 'eleven_multilingual_v2';

const DEFAULT_VOICE_IDS: Record<ElevenLabsVoiceGender, string> = {
  male: 'pNInz6obpgDQGcFmaJgB',
  female: 'EXAVITQu4vr4xnSDxMaL',
};

export interface ElevenLabsSpeechRequest {
  text: string;
  gender: ElevenLabsVoiceGender;
  voiceId?: string;
}

export function pickElevenLabsVoiceId(gender: ElevenLabsVoiceGender): string {
  const envKey =
    gender === 'male' ? process.env.ELEVENLABS_VOICE_ID_MALE : process.env.ELEVENLABS_VOICE_ID_FEMALE;
  return envKey?.trim() || DEFAULT_VOICE_IDS[gender];
}

export function buildElevenLabsSpeechBody({
  text,
  gender,
  voiceId,
}: ElevenLabsSpeechRequest): {
  text: string;
  model_id: string;
  voice_settings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
} {
  return {
    text,
    model_id: ELEVENLABS_TTS_MODEL,
    voice_settings: {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.2,
      use_speaker_boost: true,
    },
  };
}

export function resolveElevenLabsVoiceId(
  gender: ElevenLabsVoiceGender,
  voiceId?: string,
): string {
  return voiceId?.trim() || pickElevenLabsVoiceId(gender);
}
