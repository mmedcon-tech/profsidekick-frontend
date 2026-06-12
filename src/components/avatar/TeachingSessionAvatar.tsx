'use client';

import React from 'react';
import PortraitAvatarStage from '@/components/avatar/PortraitAvatarStage';
import StaticAvatarWidget from '@/components/avatar/StaticAvatarWidget';
import { useAudioAmplitude } from '@/hooks/useAudioAmplitude';
import { useTalkingHeadsAvatar } from '@/hooks/useTalkingHeadsAvatar';
import { getAvatarLibraryEntry } from '@/lib/avatarLibrary';
import { deriveAvatarWidgetState } from '@/lib/avatarStateMachine';
import type { SessionAvatarConfig } from '@/types/types';

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
  const audioAmplitude = useAudioAmplitude(audioElement, isSpeakingActive);
  const talkingHeads = useTalkingHeadsAvatar(config, isConnected);

  const libraryEntry = config.glbLibraryId
    ? getAvatarLibraryEntry(config.glbLibraryId)
    : undefined;

  const imageUrl =
    config.imageUrl ??
    libraryEntry?.thumbnailPath ??
    (config.glbLibraryId === 'avatar-2'
      ? '/images/avatar-male.png'
      : '/images/avatar-female.png');

  if (config.renderType === 'glb') {
    return (
      <div className="flex h-full w-full flex-col bg-gray-900">
        <PortraitAvatarStage
          imageUrl={imageUrl}
          avatarName={config.avatarName}
          widgetState={widgetState}
          amplitude={isSpeakingActive ? audioAmplitude : 0}
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
        amplitude={isSpeakingActive ? audioAmplitude : 0}
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
