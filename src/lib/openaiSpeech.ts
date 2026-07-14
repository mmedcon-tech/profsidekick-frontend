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
  /** Explicit voice id (e.g. a publisher's chosen voice) — bypasses the
   * gender-based pick when provided. */
  voice?: string;
}

export function buildOpenAiSpeechBody({ text, gender, voice }: OpenAiSpeechRequest): {
  model: string;
  input: string;
  voice: string;
  response_format: 'mp3';
  speed: number;
} {
  return {
    model: OPENAI_TTS_MODEL,
    input: text,
    voice: voice || pickOpenAiTtsVoice(gender),
    response_format: 'mp3',
    speed: 0.96,
  };
}
