'use client';

import React from 'react';
import StaticAvatarWidget from '@/components/avatar/StaticAvatarWidget';
import { useAudioAmplitude } from '@/hooks/useAudioAmplitude';
import { useTalkingHeadsAvatar } from '@/hooks/useTalkingHeadsAvatar';
import { deriveAvatarWidgetState } from '@/lib/avatarStateMachine';
import type { SessionAvatarConfig } from '@/types/types';

import PortraitAvatarStage from '@/components/avatar/PortraitAvatarStage';
import GlbAvatarPreview from '@/components/avatar/GlbAvatarPreview';
import { getAvatarLibraryEntry } from '@/lib/avatarLibrary';

interface TeachingSessionAvatarProps {
  config: SessionAvatarConfig;
  audioElement: HTMLAudioElement | null;
  isConnected: boolean;
  isAISpeaking: boolean;
  isUserSpeaking: boolean;
}

export default function TeachingSessionAvatar({
  config,
  audioElement,
  isConnected,
  isAISpeaking,
  isUserSpeaking,
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

  const isDirectGlbUrl = config.glbLibraryId?.endsWith('.glb');
  const glbUrl = isDirectGlbUrl ? config.glbLibraryId : libraryEntry?.glbPath;

  const imageUrl =
    config.imageUrl ??
    libraryEntry?.thumbnailPath ??
    (config.glbLibraryId === 'avatar-2' || (isDirectGlbUrl && config.glbLibraryId.includes('male'))
      ? '/images/avatar-male.png'
      : '/images/avatar-female.png');

  if (config.renderType === 'glb' && glbUrl) {
    return (
      <div className="flex h-full w-full flex-col bg-gray-900">
        <GlbAvatarPreview
          glbUrl={glbUrl}
          amplitude={amplitude}
          showControls={false}
          framing="bust"
        />
      </div>
    );
  }

  if (config.renderType === 'glb') {
    return (
      <div className="flex h-full w-full flex-col bg-gray-900">
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
    <div className="flex h-full w-full flex-col items-center justify-center bg-gray-900 gap-2">
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

