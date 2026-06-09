'use client';

import React from 'react';
import TeachingSessionAvatar from '@/components/avatar/TeachingSessionAvatar';
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
      <div className="absolute left-0 right-0 top-0 z-10 bg-gray-900/80 px-3 py-2 text-center backdrop-blur-sm">
        <p className="text-[11px] font-medium text-gray-200">
          {getAvatarModeLabel(config.renderType)}
        </p>
        {heygenPaused && (
          <p className="mt-0.5 text-[10px] text-amber-400">
            HeyGen paused — using static animated avatar until API key is ready
          </p>
        )}
        {effectiveType === 'talkingheads' && (
          <p className="mt-0.5 text-[10px] text-violet-300">
            Animated mode — provider integration pending
          </p>
        )}
      </div>

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
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                <span className="text-[11px] text-gray-500">Connecting HeyGen…</span>
              </div>
            )}
          </>
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
