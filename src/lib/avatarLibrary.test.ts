import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CHATBOT_AVATAR_ID,
  getDefaultChatbotAvatar,
  getAvatarLibraryEntry,
  resolveGlbUrl,
} from './avatarLibrary';

describe('avatarLibrary chatbot defaults', () => {
  it('uses Sultan (Emirati male) as the default chatbot avatar', () => {
    const avatar = getDefaultChatbotAvatar();
    expect(avatar.id).toBe(DEFAULT_CHATBOT_AVATAR_ID);
    expect(avatar.name).toBe('Sultan');
    expect(avatar.glbPath).toBe('/avatars/avatar-2.glb');
    expect(avatar.thumbnailPath).toBe('/images/avatar-male.png');
  });

  it('resolves GLB URL from default chatbot library id', () => {
    expect(resolveGlbUrl(null, DEFAULT_CHATBOT_AVATAR_ID)).toBe('/avatars/avatar-2.glb');
    expect(getAvatarLibraryEntry(DEFAULT_CHATBOT_AVATAR_ID)?.lipSync.morphTargets.length).toBeGreaterThan(0);
  });
});
