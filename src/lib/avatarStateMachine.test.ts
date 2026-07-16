import { describe, expect, it } from 'vitest';
import { deriveAvatarWidgetState } from '@/lib/avatarStateMachine';

describe('deriveAvatarWidgetState', () => {
  it('returns speaking when AI is talking', () => {
    expect(
      deriveAvatarWidgetState({
        isConnected: true,
        isAISpeaking: true,
        isUserSpeaking: false,
      }),
    ).toBe('speaking');
  });

  it('returns listening when user is talking', () => {
    expect(
      deriveAvatarWidgetState({
        isConnected: true,
        isAISpeaking: false,
        isUserSpeaking: true,
      }),
    ).toBe('listening');
  });
});
