import { afterEach, describe, expect, it } from 'vitest';
import {
  getAvatarModeLabel,
  getEffectiveRenderType,
  isHeyGenEnabled,
  shouldUseHeyGenVideo,
} from '@/lib/heygenConfig';
import type { SessionAvatarConfig } from '@/types/types';

const heygenConfig: SessionAvatarConfig = {
  renderType: 'heygen',
  avatarName: 'Prof',
  heygenAvatarId: 'avatar_123',
};

describe('heygenConfig', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_HEYGEN_ENABLED;
    delete process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID_FEMALE;
    delete process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID_MALE;
  });

  it('isHeyGenEnabled is false unless env flag is true', () => {
    expect(isHeyGenEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_HEYGEN_ENABLED = 'true';
    expect(isHeyGenEnabled()).toBe(true);
  });

  it('shouldUseHeyGenVideo returns false while HeyGen is paused', () => {
    expect(shouldUseHeyGenVideo(heygenConfig)).toBe(false);
  });

  it('shouldUseHeyGenVideo returns true when enabled and configured', () => {
    process.env.NEXT_PUBLIC_HEYGEN_ENABLED = 'true';
    expect(shouldUseHeyGenVideo(heygenConfig)).toBe(true);
  });

  it('shouldUseHeyGenVideo returns false for static and talkingheads', () => {
    process.env.NEXT_PUBLIC_HEYGEN_ENABLED = 'true';
    expect(
      shouldUseHeyGenVideo({ renderType: 'static', avatarName: 'A' }),
    ).toBe(false);
    expect(
      shouldUseHeyGenVideo({ renderType: 'talkingheads', avatarName: 'A' }),
    ).toBe(false);
  });

  it('getEffectiveRenderType maps heygen to static when paused', () => {
    expect(getEffectiveRenderType(heygenConfig)).toBe('static');
    process.env.NEXT_PUBLIC_HEYGEN_ENABLED = 'true';
    expect(getEffectiveRenderType(heygenConfig)).toBe('heygen');
  });

  it('getAvatarModeLabel returns human-readable labels', () => {
    expect(getAvatarModeLabel('static')).toBe('Static photo');
    expect(getAvatarModeLabel('talkingheads')).toBe('Animated (TalkingHeads)');
    expect(getAvatarModeLabel('heygen')).toBe('Realistic (HeyGen)');
  });
});
