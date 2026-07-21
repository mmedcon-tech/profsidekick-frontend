import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CHATBOT_AVATAR_ID,
  getDefaultChatbotAvatar,
  getAvatarLibraryEntry,
  getAvatarVoiceProfile,
  resolveGlbUrl,
  resolvePortraitPresentation,
} from './avatarLibrary';

describe('avatarLibrary chatbot defaults', () => {
  it('uses Sultan (Emirati male) as the default chatbot avatar', () => {
    const avatar = getDefaultChatbotAvatar();
    expect(avatar.id).toBe(DEFAULT_CHATBOT_AVATAR_ID);
    expect(avatar.name).toBe('Sultan');
    expect(avatar.glbPath).toBe('/avatars/avatar-2.glb');
    expect(avatar.thumbnailPath).toBe('/images/sultan-emirati-reference.png');
  });

  it('resolves GLB URL from default chatbot library id', () => {
    expect(resolveGlbUrl(null, DEFAULT_CHATBOT_AVATAR_ID)).toBe('/avatars/avatar-2.glb');
    expect(getAvatarLibraryEntry(DEFAULT_CHATBOT_AVATAR_ID)?.lipSync.morphTargets.length).toBeGreaterThan(0);
  });

  it('maps kids avatars to the kids voice profile', () => {
    const layla = getAvatarLibraryEntry('kids-female');
    expect(layla).toBeDefined();
    expect(getAvatarVoiceProfile(layla!)).toBe('kids');
    expect(layla?.lipSync.jawBones).not.toContain('Head');
  });

  it('exposes Salama as an Emirati woman with aligned portrait framing', () => {
    const salama = getAvatarLibraryEntry('avatar-1');
    expect(salama?.tagline).toMatch(/Emirati woman/i);
    expect(salama?.thumbnailPath).toBe('/images/salama-emirati-reference.png');
    const portrait = resolvePortraitPresentation(salama!);
    expect(portrait.objectFit).toBe('cover');
    expect(portrait.objectPosition).toMatch(/center/i);
  });
});
