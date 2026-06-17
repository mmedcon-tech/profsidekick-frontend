'use client';

import React from 'react';
import TeachingSessionAvatar from '@/components/avatar/TeachingSessionAvatar';
import GlbAvatar from '@/components/avatar/GlbAvatar';
import {
  getAvatarModeLabel,
  getEffectiveRenderType,
  isHeyGenEnabled,
  shouldUseHeyGenVideo,
} from '@/lib/heygenConfig';
import type { SessionAvatarConfig } from '@/types/types';

interface SessionAvatarRendererProps {
  config: SessionAvatarConfig;
  audioElement: HTMLAudioElement | null;
  isConnected: boolean;
  isAISpeaking: boolean;
  isUserSpeaking: boolean;
  heygenConnected?: boolean;
  heygenVideoRef?: React.RefObject<HTMLVideoElement | null>;
}

export default function SessionAvatarRenderer({
  config,
  audioElement,
  isConnected,
  isAISpeaking,
  isUserSpeaking,
  heygenConnected = false,
  heygenVideoRef,
}: SessionAvatarRendererProps): React.ReactElement {
  const effectiveType = getEffectiveRenderType(config);
  const displayConfig: SessionAvatarConfig = {
    ...config,
    renderType: effectiveType,
  };
  const useHeyGen = shouldUseHeyGenVideo(config);
  const heygenPaused =
    config.renderType === 'heygen' && !isHeyGenEnabled();

  return (
    <div className="relative flex h-full w-full flex-col bg-gray-900">
      <div className="flex flex-1 items-center justify-center pt-10">
        {useHeyGen && heygenVideoRef ? (
          <>
            <video
              ref={heygenVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
            {!heygenConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-900">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/50 dark:border-primary/50 border-t-transparent" />
                <span className="text-[11px] text-gray-500">Connecting HeyGen…</span>
              </div>
            )}
          </>
        ) : displayConfig.renderType === '3d' && displayConfig.modelUrl ? (
          <GlbAvatar
            modelUrl={displayConfig.modelUrl}
            audioElement={audioElement}
            isConnected={isConnected}
            isAISpeaking={isAISpeaking}
            isUserSpeaking={isUserSpeaking}
          />
        ) : (
          <TeachingSessionAvatar
            config={displayConfig}
            audioElement={audioElement}
            isConnected={isConnected}
            isAISpeaking={isAISpeaking}
            isUserSpeaking={isUserSpeaking}
          />
        )}
      </div>
    </div>
  );
}
