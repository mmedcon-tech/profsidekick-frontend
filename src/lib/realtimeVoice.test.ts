import { describe, expect, it } from 'vitest';
import {
  pickRealtimeVoiceForAvatar,
  pickRealtimeVoiceForLibraryId,
} from './realtimeVoice';
import type { SessionAvatarConfig } from '@/types/types';

describe('pickRealtimeVoiceForLibraryId', () => {
  it('maps avatar-2 to cedar (male)', () => {
    expect(pickRealtimeVoiceForLibraryId('avatar-2')).toBe('cedar');
  });
});

describe('pickRealtimeVoiceForAvatar', () => {
  it('uses a male realtime voice for Sultan (avatar-2)', () => {
    const config: SessionAvatarConfig = {
      renderType: 'glb',
      avatarName: 'Sultan',
      glbLibraryId: 'avatar-2',
    };
    expect(pickRealtimeVoiceForAvatar(config)).toBe('cedar');
  });

  it('uses a female realtime voice for Salama (avatar-1)', () => {
    const config: SessionAvatarConfig = {
      renderType: 'glb',
      avatarName: 'Salama',
      glbLibraryId: 'avatar-1',
    };
    expect(pickRealtimeVoiceForAvatar(config)).toBe('marin');
  });
});
