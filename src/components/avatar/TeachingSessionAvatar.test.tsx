import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeachingSessionAvatar from './TeachingSessionAvatar';
import type { SessionAvatarConfig } from '@/types/types';
import type { VisemeTimeline } from '@/lib/visemeTypes';

const glbPreviewSpy = vi.fn();

vi.mock('@/components/avatar/GlbAvatarPreview', () => ({
  default: (props: any) => {
    glbPreviewSpy(props);
    return <div data-testid="mock-glb-preview" data-glb-url={props.glbUrl} />;
  },
}));

vi.mock('@/hooks/useAudioAmplitude', () => ({
  useAudioAmplitude: () => 0,
}));

vi.mock('@/hooks/useVisemePlayback', () => ({
  useVisemePlayback: vi.fn(() => ({ current: null })),
}));

import { useVisemePlayback } from '@/hooks/useVisemePlayback';

function baseProps() {
  return {
    audioElement: null,
    isConnected: true,
    isAISpeaking: false,
    isUserSpeaking: false,
  };
}

describe('TeachingSessionAvatar — GLB resolution', () => {
  it('renders GlbAvatarPreview using the avatar-library glbPath when glbLibraryId matches an entry', () => {
    const config: SessionAvatarConfig = {
      renderType: 'glb',
      avatarName: 'Salama',
      glbLibraryId: 'avatar-1',
    };
    render(<TeachingSessionAvatar config={config} {...baseProps()} />);

    const preview = screen.getByTestId('mock-glb-preview');
    expect(preview).toHaveAttribute('data-glb-url', '/avatars/avatar-1.glb');
  });

  it('falls back to config.modelUrl when there is no matching avatar-library entry (regression: publisher-uploaded models must still get lip sync)', () => {
    const config: SessionAvatarConfig = {
      renderType: '3d',
      avatarName: 'Custom Avatar',
      modelUrl: 'https://cdn.example.com/custom-avatar.glb',
    };
    render(<TeachingSessionAvatar config={config} {...baseProps()} />);

    const preview = screen.getByTestId('mock-glb-preview');
    expect(preview).toHaveAttribute('data-glb-url', 'https://cdn.example.com/custom-avatar.glb');
  });

  it('does not render the GLB preview when neither glbLibraryId nor a .glb modelUrl resolve', () => {
    const config: SessionAvatarConfig = {
      renderType: '3d',
      avatarName: 'No Model',
      imageUrl: '/images/avatar-female.png',
    };
    render(<TeachingSessionAvatar config={config} {...baseProps()} />);

    expect(screen.queryByTestId('mock-glb-preview')).not.toBeInTheDocument();
  });

  it('passes amplitude, lip-sync hints and the viseme ref through to GlbAvatarPreview', () => {
    const config: SessionAvatarConfig = {
      renderType: 'glb',
      avatarName: 'Salama',
      glbLibraryId: 'avatar-1',
    };
    render(
      <TeachingSessionAvatar
        config={config}
        {...baseProps()}
        lipSyncAmplitude={0.6}
        isAISpeaking
      />,
    );

    expect(glbPreviewSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        amplitude: 0.6,
        isSpeaking: true,
        lipSyncHints: expect.objectContaining({
          morphTargets: expect.any(Array),
        }),
      }),
    );
  });

  it('wires a viseme timeline into useVisemePlayback and only activates it while connected and speaking', () => {
    const config: SessionAvatarConfig = {
      renderType: 'glb',
      avatarName: 'Salama',
      glbLibraryId: 'avatar-1',
    };
    const timeline: VisemeTimeline = {
      duration: 1,
      keyframes: [{ time: 0, viseme: 'aa', duration: 0.2 }],
    };
    const speechClock = () => 0.1;

    render(
      <TeachingSessionAvatar
        config={config}
        {...baseProps()}
        isAISpeaking
        visemeTimeline={timeline}
        speechClock={speechClock}
      />,
    );

    expect(useVisemePlayback).toHaveBeenCalledWith(
      speechClock,
      timeline,
      true,
      expect.any(Object),
    );
  });
});
