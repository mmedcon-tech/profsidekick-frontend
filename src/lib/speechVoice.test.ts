import { describe, expect, it } from 'vitest';
import { pickSpeechVoice } from './speechVoice';

const mockVoices = [
  { name: 'Samantha', lang: 'en-US' },
  { name: 'Daniel', lang: 'en-GB' },
  { name: 'Karen', lang: 'en-AU' },
  { name: 'Alex', lang: 'en-US' },
] as SpeechSynthesisVoice[];

describe('pickSpeechVoice', () => {
  it('picks a male voice for Sultan', () => {
    const voice = pickSpeechVoice('male', mockVoices);
    expect(voice?.name).toMatch(/Daniel|Alex/i);
  });

  it('picks a female voice for Salama', () => {
    const voice = pickSpeechVoice('female', mockVoices);
    expect(voice?.name).toMatch(/Samantha|Karen/i);
  });
});
