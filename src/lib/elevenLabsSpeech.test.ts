import { describe, expect, it } from 'vitest';
import {
  buildElevenLabsSpeechBody,
  classifyElevenLabsErrorResponse,
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

describe('classifyElevenLabsErrorResponse', () => {
  it('classifies the real-world quota_exceeded body as platform_quota_exceeded', () => {
    const body = JSON.stringify({
      detail: {
        type: 'invalid_request',
        code: 'quota_exceeded',
        message:
          'This request exceeds your quota of 10000. You have 7 credits remaining, while 161 credits are required for this request.',
        status: 'quota_exceeded',
        request_id: '7a9cd325cdf2892baad5fb6645e5a726',
      },
    });
    expect(classifyElevenLabsErrorResponse(401, body)).toBe('platform_quota_exceeded');
  });

  it('classifies any 401 as platform_quota_exceeded even without a parsable body', () => {
    expect(classifyElevenLabsErrorResponse(401, 'not json')).toBe('platform_quota_exceeded');
  });

  it('classifies 429 as platform_quota_exceeded', () => {
    expect(classifyElevenLabsErrorResponse(429, '')).toBe('platform_quota_exceeded');
  });

  it('classifies a detail.status quota_exceeded body on other status codes', () => {
    const body = JSON.stringify({ detail: { status: 'quota_exceeded' } });
    expect(classifyElevenLabsErrorResponse(400, body)).toBe('platform_quota_exceeded');
  });

  it('classifies an unrelated 500 error as unknown', () => {
    const body = JSON.stringify({ detail: { message: 'internal error' } });
    expect(classifyElevenLabsErrorResponse(500, body)).toBe('unknown');
  });

  it('classifies a non-JSON body on a non-401/429 status as unknown', () => {
    expect(classifyElevenLabsErrorResponse(400, 'plain text error')).toBe('unknown');
  });
});
