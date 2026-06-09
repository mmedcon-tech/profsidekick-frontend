'use client';

import React from 'react';
import StaticAvatarWidget from '@/components/avatar/StaticAvatarWidget';
import { useAudioAmplitude } from '@/hooks/useAudioAmplitude';
import { useTalkingHeadsAvatar } from '@/hooks/useTalkingHeadsAvatar';
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
  const amplitude = useAudioAmplitude(
    audioElement,
    widgetState === 'speaking' && isConnected,
  );
  const talkingHeads = useTalkingHeadsAvatar(config, isConnected);

  const imageUrl =
    config.imageUrl ??
    (process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID_FEMALE
      ? '/images/avatar-female.png'
      : '/images/avatar-male.png');

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
