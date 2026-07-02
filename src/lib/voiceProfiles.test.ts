import { describe, expect, it } from 'vitest';
import { genderForVoice, resolveVoiceProfile } from './voiceProfiles';

describe('resolveVoiceProfile', () => {
  it('derives a male voice for male voice ids', () => {
    const p = resolveVoiceProfile('ash');
    expect(p.gender).toBe('male');
    expect(p.pitch).toBeLessThan(1);
  });

  it('derives a female voice for female voice ids', () => {
    const p = resolveVoiceProfile('coral');
    expect(p.gender).toBe('female');
    expect(p.pitch).toBeGreaterThan(1);
  });

  it('handles realtime voice labels (cedar/marin)', () => {
    expect(resolveVoiceProfile('cedar').gender).toBe('male');
    expect(resolveVoiceProfile('marin').gender).toBe('female');
  });

  it('falls back to the avatar gender hint for unknown ids', () => {
    expect(resolveVoiceProfile('unknown-voice', 'male').gender).toBe('male');
    expect(resolveVoiceProfile(null, 'female').gender).toBe('female');
  });

  it('is case-insensitive and trims', () => {
    expect(resolveVoiceProfile('  ECHO ').gender).toBe('male');
  });
});

describe('genderForVoice', () => {
  it('returns undefined for unknown ids', () => {
    expect(genderForVoice('nope')).toBeUndefined();
    expect(genderForVoice('verse')).toBe('male');
  });
});
