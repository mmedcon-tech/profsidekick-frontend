'use client';

import React from 'react';
import StaticAvatarWidget from '@/components/avatar/StaticAvatarWidget';
import { useAudioAmplitude } from '@/hooks/useAudioAmplitude';
import { useTalkingHeadsAvatar } from '@/hooks/useTalkingHeadsAvatar';
import { useVisemePlayback } from '@/hooks/useVisemePlayback';
import { deriveAvatarWidgetState } from '@/lib/avatarStateMachine';
import type { SessionAvatarConfig } from '@/types/types';

import PortraitAvatarStage from '@/components/avatar/PortraitAvatarStage';
import GlbAvatarPreview from '@/components/avatar/GlbAvatarPreview';
import { getAvatarLibrary, getAvatarLibraryEntry } from '@/lib/avatarLibrary';
import type { VisemeTimeline } from '@/lib/visemeTypes';

const NOOP_CLOCK = (): number => 0;

interface TeachingSessionAvatarProps {
  config: SessionAvatarConfig;
  audioElement: HTMLAudioElement | null;
  isConnected: boolean;
  isAISpeaking: boolean;
  isUserSpeaking: boolean;
  visemeTimeline?: VisemeTimeline | null;
  speechClock?: () => number;
}

export default function TeachingSessionAvatar({
  config,
  audioElement,
  isConnected,
  isAISpeaking,
  isUserSpeaking,
  visemeTimeline = null,
  speechClock,
}: TeachingSessionAvatarProps): React.ReactElement {
  const widgetState = deriveAvatarWidgetState({
    isConnected,
    isAISpeaking,
    isUserSpeaking,
  });
  const isSpeakingActive = widgetState === 'speaking' && isConnected;
  const amplitude = useAudioAmplitude(audioElement, isSpeakingActive);
  const talkingHeads = useTalkingHeadsAvatar(config, isConnected);

  const libraryEntry = config.glbLibraryId
    ? getAvatarLibraryEntry(config.glbLibraryId)
    : undefined;
  const modelUrlLibraryEntry = config.modelUrl
    ? getAvatarLibrary().avatars.find(
        (entry) =>
          config.modelUrl === entry.glbPath ||
          config.modelUrl?.endsWith(entry.glbPath),
      )
    : undefined;

  const isDirectGlbUrl = config.glbLibraryId?.endsWith('.glb');
  const glbUrl = config.modelUrl ?? (isDirectGlbUrl ? config.glbLibraryId : libraryEntry?.glbPath);
  const lipSyncHints = libraryEntry?.lipSync ?? modelUrlLibraryEntry?.lipSync;
  const hasVisemeTimeline = !!visemeTimeline && visemeTimeline.keyframes.length > 0;
  const visemeRef = useVisemePlayback(
    speechClock ?? NOOP_CLOCK,
    visemeTimeline,
    isSpeakingActive && hasVisemeTimeline,
    lipSyncHints,
  );

  const imageUrl =
    config.imageUrl ??
    libraryEntry?.thumbnailPath ??
    (config.glbLibraryId === 'avatar-2' || (isDirectGlbUrl && config.glbLibraryId?.includes('male'))
      ? '/images/avatar-male.png'
      : '/images/avatar-female.png');

  if ((config.renderType === '3d' || config.renderType === 'glb') && glbUrl) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col bg-sidebar">
        <GlbAvatarPreview
          glbUrl={glbUrl}
          lipSyncHints={lipSyncHints}
          visemeRef={visemeRef}
          amplitude={hasVisemeTimeline ? 0 : amplitude}
          showControls={false}
          framing="full"
          fitMargin={1.08}
          modelScale={1.2}
          coverHeightFraction={0.62}
        />
      </div>
    );
  }

  if (config.renderType === '3d') {
    return (
      <div className="flex h-full min-h-0 w-full flex-col bg-sidebar">
        <PortraitAvatarStage
          imageUrl={imageUrl}
          avatarName={config.avatarName}
          widgetState={widgetState}
          amplitude={amplitude}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-2 bg-sidebar">
      <StaticAvatarWidget
        imageUrl={imageUrl}
        avatarName={config.avatarName}
        widgetState={widgetState}
        amplitude={amplitude}
        size={200}
        variant={config.renderType === 'talkingheads' ? 'talkingheads' : 'static'}
      />
      {talkingHeads.error && (
        <p className="px-4 text-center text-[11px] text-amber-400">
          {talkingHeads.error}
        </p>
      )}
    </div>
  );
}

