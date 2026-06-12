'use client';

import React from 'react';
import GlbAvatarPreview from '@/components/avatar/GlbAvatarPreview';
import StaticAvatarWidget from '@/components/avatar/StaticAvatarWidget';
import { useAudioAmplitude } from '@/hooks/useAudioAmplitude';
import { useSimulatedAmplitude } from '@/hooks/useSimulatedAmplitude';
import { useTalkingHeadsAvatar } from '@/hooks/useTalkingHeadsAvatar';
import { getAvatarLibraryEntry, resolveGlbUrl } from '@/lib/avatarLibrary';
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
  const simulatedAmplitude = useSimulatedAmplitude(
    config.renderType === 'glb' && isSpeakingActive && audioAmplitude < 0.02,
  );
  const amplitude = Math.max(audioAmplitude, simulatedAmplitude);
  const talkingHeads = useTalkingHeadsAvatar(config, isConnected);

  const imageUrl =
    config.imageUrl ??
    (process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID_FEMALE
      ? '/images/avatar-female.png'
      : '/images/avatar-male.png');

  if (config.renderType === 'glb') {
    const libraryEntry = config.glbLibraryId
      ? getAvatarLibraryEntry(config.glbLibraryId)
      : undefined;
    const glbUrl = resolveGlbUrl(
      config.glbModelUrl,
      config.glbLibraryId ?? libraryEntry?.id ?? 'avatar-1',
    );

    return (
      <div className="flex h-full w-full flex-col bg-gray-900">
        <GlbAvatarPreview
          glbUrl={glbUrl}
          amplitude={widgetState === 'speaking' ? amplitude : 0}
          lipSyncHints={{
            morphTargets: libraryEntry?.lipSync.morphTargets,
            blinkTargets: libraryEntry?.lipSync.blinkTargets,
            jawBones: libraryEntry?.lipSync.jawBones,
          }}
          showControls={false}
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
