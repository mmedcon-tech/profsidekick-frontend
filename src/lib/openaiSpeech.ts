export type SpeechVoiceGender = 'male' | 'female';

/** OpenAI TTS voices tuned for natural marketplace previews. */
const OPENAI_VOICES: Record<SpeechVoiceGender, string> = {
  male: 'cedar',
  female: 'marin',
};

export function pickOpenAiTtsVoice(gender: SpeechVoiceGender): string {
  return OPENAI_VOICES[gender];
}

export const OPENAI_TTS_MODEL = 'tts-1-hd';

export interface OpenAiSpeechRequest {
  text: string;
  gender: SpeechVoiceGender;
  /**
   * Explicit OpenAI voice id (e.g. from the dual voice pipeline's resolved
   * session voice). Takes priority over `gender`, which stays as the
   * marketplace-preview fallback.
   */
  voiceId?: string;
}

export function buildOpenAiSpeechBody({
  text,
  gender,
  voiceId,
}: OpenAiSpeechRequest): {
  model: string;
  input: string;
  voice: string;
  response_format: 'mp3';
  speed: number;
} {
  return {
    model: OPENAI_TTS_MODEL,
    input: text,
    voice: voiceId?.trim() || pickOpenAiTtsVoice(gender),
    response_format: 'mp3',
    speed: 0.96,
  };
}
