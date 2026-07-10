'use client';

import React from 'react';
import TeachingSessionAvatar from '@/components/avatar/TeachingSessionAvatar';
import {
  getEffectiveRenderType,
  shouldUseHeyGenVideo,
} from '@/lib/heygenConfig';
import type { SessionAvatarConfig } from '@/types/types';
import type { VisemeTimeline } from '@/lib/visemeTypes';

interface SessionAvatarRendererProps {
  config: SessionAvatarConfig;
  audioElement: HTMLAudioElement | null;
  isConnected: boolean;
  isAISpeaking: boolean;
  isUserSpeaking: boolean;
  heygenConnected?: boolean;
  heygenVideoRef?: React.RefObject<HTMLVideoElement | null>;
  lipSyncAmplitude?: number;
  /** Per-character viseme timeline, when a provider supplies one — see TeachingSessionAvatar. */
  visemeTimeline?: VisemeTimeline | null;
  /** Returns elapsed seconds within the current utterance (audio currentTime). */
  speechClock?: () => number;
}

export default function SessionAvatarRenderer({
  config,
  audioElement,
  isConnected,
  isAISpeaking,
  isUserSpeaking,
  heygenConnected = false,
  heygenVideoRef,
  lipSyncAmplitude,
  visemeTimeline,
  speechClock,
}: SessionAvatarRendererProps): React.ReactElement {
  const effectiveType = getEffectiveRenderType(config);
  const displayConfig: SessionAvatarConfig = {
    ...config,
    renderType: effectiveType,
  };
  const useHeyGen = shouldUseHeyGenVideo(config);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-sidebar">
      <div className="flex min-h-0 flex-1 items-stretch justify-center">
        {useHeyGen && heygenVideoRef ? (
          <>
            <video
              ref={heygenVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
            {!heygenConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-sidebar">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/50 dark:border-primary/50 border-t-transparent" />
                <span className="text-[11px] text-sidebar-foreground/70">Connecting HeyGen...</span>
              </div>
            )}
          </>
        ) : (
          // Every non-HeyGen config (glb, 3d, static, talkingheads) routes through
          // TeachingSessionAvatar so GLB configs always get the same GlbAvatarPreview
          // lip-sync pipeline, regardless of whether the model came from the avatar
          // library (glbLibraryId) or a raw modelUrl.
          <TeachingSessionAvatar
            config={displayConfig}
            audioElement={audioElement}
            isConnected={isConnected}
            isAISpeaking={isAISpeaking}
            isUserSpeaking={isUserSpeaking}
            lipSyncAmplitude={lipSyncAmplitude}
            visemeTimeline={visemeTimeline}
            speechClock={speechClock}
          />
        )}
      </div>
    </div>
  );
}
