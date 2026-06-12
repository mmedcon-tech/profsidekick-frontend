import { describe, expect, it } from 'vitest';
import { buildOpenAiSpeechBody, pickOpenAiTtsVoice } from './openaiSpeech';

describe('openaiSpeech', () => {
  it('picks natural male and female OpenAI voices', () => {
    expect(pickOpenAiTtsVoice('male')).toBe('cedar');
    expect(pickOpenAiTtsVoice('female')).toBe('marin');
  });

  it('builds a speech request body with HD model', () => {
    const body = buildOpenAiSpeechBody({
      text: 'Hello there',
      gender: 'female',
    });
    expect(body.model).toBe('tts-1-hd');
    expect(body.voice).toBe('marin');
    expect(body.input).toBe('Hello there');
    expect(body.response_format).toBe('mp3');
  });
});
