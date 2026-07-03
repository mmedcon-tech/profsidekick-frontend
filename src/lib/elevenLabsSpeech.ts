export type ElevenLabsVoiceGender = 'male' | 'female';
export type ElevenLabsVoiceProfile = 'adult' | 'kids';

export const ELEVENLABS_TTS_MODEL = 'eleven_multilingual_v2';

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
  const isKids = voiceProfile === 'kids';
  return {
    text,
    model_id: ELEVENLABS_TTS_MODEL,
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

/**
 * Dual voice pipeline — classifies a failed ElevenLabs API response.
 *
 * ElevenLabs is a single shared platform account (one API key for every
 * subscriber's synthesis calls), so a quota/auth failure here is always a
 * platform-side problem — never an individual subscriber's own credit
 * balance (that is a completely separate signal: a 402 from our own
 * `/voice-usage` billing endpoint). `'unknown'` covers anything else (bad
 * input text, transient network error, etc.) which isn't a quota issue but
 * still isn't the subscriber's fault either.
 */
export type ElevenLabsErrorCode = 'platform_quota_exceeded' | 'unknown';

export function classifyElevenLabsErrorResponse(
  status: number,
  rawBody: string,
): ElevenLabsErrorCode {
  if (status === 401 || status === 429) {
    return 'platform_quota_exceeded';
  }
  try {
    const parsed = JSON.parse(rawBody);
    const code = parsed?.detail?.code ?? parsed?.detail?.status ?? parsed?.status;
    if (code === 'quota_exceeded') {
      return 'platform_quota_exceeded';
    }
  } catch {
    // Not JSON — fall through to 'unknown'.
  }
  return 'unknown';
}
