import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SessionAvatarRenderer from './SessionAvatarRenderer';
import type { SessionAvatarConfig } from '@/types/types';

const teachingSessionAvatarSpy = vi.fn();

vi.mock('@/components/avatar/TeachingSessionAvatar', () => ({
  default: (props: any) => {
    teachingSessionAvatarSpy(props);
    return <div data-testid="mock-teaching-session-avatar" />;
  },
}));

vi.mock('@/lib/heygenConfig', async () => {
  const actual = await vi.importActual<typeof import('@/lib/heygenConfig')>(
    '@/lib/heygenConfig',
  );
  return {
    ...actual,
    shouldUseHeyGenVideo: vi.fn(() => false),
  };
});

import { shouldUseHeyGenVideo } from '@/lib/heygenConfig';

function baseProps(config: SessionAvatarConfig) {
  return {
    config,
    audioElement: null,
    isConnected: true,
    isAISpeaking: false,
    isUserSpeaking: false,
  };
}

beforeEach(() => {
  teachingSessionAvatarSpy.mockClear();
  vi.mocked(shouldUseHeyGenVideo).mockReturnValue(false);
});

describe('SessionAvatarRenderer routing', () => {
  it('routes a library glb config through TeachingSessionAvatar', () => {
    const config: SessionAvatarConfig = {
      renderType: 'glb',
      avatarName: 'Salama',
      glbLibraryId: 'avatar-1',
    };
    render(<SessionAvatarRenderer {...baseProps(config)} />);

    expect(screen.getByTestId('mock-teaching-session-avatar')).toBeInTheDocument();
    expect(teachingSessionAvatarSpy).toHaveBeenCalledTimes(1);
  });

  it('routes a raw-modelUrl 3d config through TeachingSessionAvatar too (regression: this used to render a separate GlbAvatar with no lip sync)', () => {
    const config: SessionAvatarConfig = {
      renderType: '3d',
      avatarName: 'Custom Avatar',
      modelUrl: 'https://cdn.example.com/custom-avatar.glb',
    };
    render(<SessionAvatarRenderer {...baseProps(config)} />);

    expect(screen.getByTestId('mock-teaching-session-avatar')).toBeInTheDocument();
    expect(teachingSessionAvatarSpy).toHaveBeenCalledTimes(1);
    expect(teachingSessionAvatarSpy.mock.calls[0][0].config).toEqual(
      expect.objectContaining({ modelUrl: 'https://cdn.example.com/custom-avatar.glb' }),
    );
  });

  it('forwards lipSyncAmplitude, visemeTimeline and speechClock to TeachingSessionAvatar', () => {
    const config: SessionAvatarConfig = {
      renderType: 'glb',
      avatarName: 'Salama',
      glbLibraryId: 'avatar-1',
    };
    const speechClock = () => 0.5;
    const timeline = { duration: 1, keyframes: [] };

    render(
      <SessionAvatarRenderer
        {...baseProps(config)}
        lipSyncAmplitude={0.42}
        visemeTimeline={timeline}
        speechClock={speechClock}
      />,
    );

    expect(teachingSessionAvatarSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        lipSyncAmplitude: 0.42,
        visemeTimeline: timeline,
        speechClock,
      }),
    );
  });

  it('renders the HeyGen video element instead of TeachingSessionAvatar when HeyGen is active', () => {
    vi.mocked(shouldUseHeyGenVideo).mockReturnValue(true);
    const config: SessionAvatarConfig = {
      renderType: 'heygen',
      avatarName: 'HeyGen Avatar',
      heygenAvatarId: 'abc123',
    };
    const heygenVideoRef = { current: null };

    render(
      <SessionAvatarRenderer
        {...baseProps(config)}
        heygenVideoRef={heygenVideoRef}
        heygenConnected
      />,
    );

    expect(document.querySelector('video')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-teaching-session-avatar')).not.toBeInTheDocument();
  });
});
