import { describe, expect, it } from 'vitest';
import {
  buildElevenLabsSpeechBody,
  pickElevenLabsVoiceId,
  resolveElevenLabsVoiceId,
} from './elevenLabsSpeech';

describe('elevenLabsSpeech', () => {
  it('builds multilingual ElevenLabs request bodies', () => {
    expect(buildElevenLabsSpeechBody({ text: 'Marhaba', gender: 'male' })).toEqual(
      expect.objectContaining({
        text: 'Marhaba',
        model_id: 'eleven_multilingual_v2',
      }),
    );
  });

  it('resolves voice ids from gender-specific env overrides', () => {
    process.env.ELEVENLABS_VOICE_ID_MALE = 'male-voice';
    process.env.ELEVENLABS_VOICE_ID_FEMALE = 'female-voice';

    expect(pickElevenLabsVoiceId('male')).toBe('male-voice');
    expect(resolveElevenLabsVoiceId('female')).toBe('female-voice');
    expect(resolveElevenLabsVoiceId('male', 'custom-voice')).toBe('custom-voice');

    delete process.env.ELEVENLABS_VOICE_ID_MALE;
    delete process.env.ELEVENLABS_VOICE_ID_FEMALE;
  });
});
