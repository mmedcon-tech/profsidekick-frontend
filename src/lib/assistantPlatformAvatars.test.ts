import { describe, expect, it } from 'vitest';
import {
  buildPlatformAssistantAvatar,
  getAlternatePlatformAvatarId,
  getPlatformAssistantAvatar,
  isAssistantPlatformAvatarId,
} from './assistantPlatformAvatars';
import { getAvatarLibraryEntry } from './avatarLibrary';

describe('assistantPlatformAvatars', () => {
  it('recognises valid platform avatar ids', () => {
    expect(isAssistantPlatformAvatarId('avatar-1')).toBe(true);
    expect(isAssistantPlatformAvatarId('avatar-2')).toBe(true);
    expect(isAssistantPlatformAvatarId('avatar-3')).toBe(false);
  });

  it('alternates between Salama and Sultan', () => {
    expect(getAlternatePlatformAvatarId('avatar-1')).toBe('avatar-2');
    expect(getAlternatePlatformAvatarId('avatar-2')).toBe('avatar-1');
  });

  it('builds assistant config with slower lip-sync for call mode', () => {
    const entry = getAvatarLibraryEntry('avatar-1')!;
    const avatar = buildPlatformAssistantAvatar(entry);
    expect(avatar.posterSrc).toBe('/images/salama-emirati-reference.png');
    expect(avatar.framing).toBe('full');
    expect(avatar.coverHeightFraction).toBe(0.54);
    expect(avatar.fitMargin).toBe(1);
    expect(avatar.modelScale).toBe(entry.previewModelScale);
    expect(avatar.lipSync.visemeAttack).toBe(4.5);
    expect(avatar.lipSync.visemeRelease).toBe(6.5);
    expect(avatar.lipSync.visemeBlendHold).toBe(0.68);
    expect(avatar.lipSync.mouthOpenGain).toBe(1.1);
  });

  it('keeps Sultan on the tighter RPM call crop', () => {
    const entry = getAvatarLibraryEntry('avatar-2')!;
    const avatar = buildPlatformAssistantAvatar(entry);
    expect(avatar.coverHeightFraction).toBeCloseTo(0.324, 2);
    expect(avatar.modelScale).toBeGreaterThan(entry.previewModelScale ?? 1);
    expect(avatar.lipSync.visemeAttack).toBe(2.2);
    expect(avatar.lipSync.visemeBlendHold).toBe(0.82);
    expect(avatar.lipSync.visemeIntensity).toBe(0.72);
  });

  it('resolves Sultan as the male alternate', () => {
    const sultan = getPlatformAssistantAvatar('avatar-2');
    expect(sultan.name).toBe('Sultan');
    expect(sultan.voice.gender).toBe('male');
  });
});
