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

  it('uses brighter settings for kids voices', () => {
    const kids = buildElevenLabsSpeechBody({
      text: 'Hi there',
      gender: 'female',
      voiceProfile: 'kids',
    });
    const adult = buildElevenLabsSpeechBody({
      text: 'Hi there',
      gender: 'female',
      voiceProfile: 'adult',
    });

    expect(kids.voice_settings.style).toBeGreaterThan(adult.voice_settings.style);
  });

  it('resolves voice ids from gender-specific env overrides', () => {
    process.env.ELEVENLABS_VOICE_ID_MALE = 'male-voice';
    process.env.ELEVENLABS_VOICE_ID_FEMALE = 'female-voice';
    process.env.ELEVENLABS_VOICE_ID_KIDS_MALE = 'kids-male-voice';
    process.env.ELEVENLABS_VOICE_ID_KIDS_FEMALE = 'kids-female-voice';

    expect(pickElevenLabsVoiceId('male')).toBe('male-voice');
    expect(pickElevenLabsVoiceId('female', 'kids')).toBe('kids-female-voice');
    expect(resolveElevenLabsVoiceId('female')).toBe('female-voice');
    expect(resolveElevenLabsVoiceId('male', 'custom-voice')).toBe('custom-voice');
    expect(resolveElevenLabsVoiceId('male', undefined, 'kids')).toBe('kids-male-voice');

    delete process.env.ELEVENLABS_VOICE_ID_MALE;
    delete process.env.ELEVENLABS_VOICE_ID_FEMALE;
    delete process.env.ELEVENLABS_VOICE_ID_KIDS_MALE;
    delete process.env.ELEVENLABS_VOICE_ID_KIDS_FEMALE;
  });
});
