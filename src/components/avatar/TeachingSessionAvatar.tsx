'use client';

import React from 'react';
import StaticAvatarWidget from '@/components/avatar/StaticAvatarWidget';
import { useAudioAmplitude } from '@/hooks/useAudioAmplitude';
import { useTalkingHeadsAvatar } from '@/hooks/useTalkingHeadsAvatar';
import { useVisemePlayback } from '@/hooks/useVisemePlayback';
import { deriveAvatarWidgetState } from '@/lib/avatarStateMachine';
import type { SessionAvatarConfig } from '@/types/types';
import type { VisemeTimeline } from '@/lib/visemeTypes';

import PortraitAvatarStage from '@/components/avatar/PortraitAvatarStage';
import GlbAvatarPreview from '@/components/avatar/GlbAvatarPreview';
import { getAvatarLibraryEntry, resolvePortraitPresentation } from '@/lib/avatarLibrary';

/** Stable no-op clock so the viseme hook has a constant identity when no timeline is playing. */
const NOOP_CLOCK = (): number => 0;

interface TeachingSessionAvatarProps {
  config: SessionAvatarConfig;
  audioElement: HTMLAudioElement | null;
  isConnected: boolean;
  isAISpeaking: boolean;
  isUserSpeaking: boolean;
  lipSyncAmplitude?: number;
  /**
   * Per-character viseme timeline for the current utterance, when a provider
   * supplies one (e.g. ElevenLabs character timestamps). When present, the
   * mouth is driven by real phoneme shapes synced to `speechClock` instead of
   * the generic amplitude envelope — same mechanism as ChatbotAvatar3D.
   */
  visemeTimeline?: VisemeTimeline | null;
  /** Returns elapsed seconds within the current utterance (audio currentTime). */
  speechClock?: () => number;
}

export default function TeachingSessionAvatar({
  config,
  audioElement,
  isConnected,
  isAISpeaking,
  isUserSpeaking,
  lipSyncAmplitude,
  visemeTimeline = null,
  speechClock,
}: TeachingSessionAvatarProps): React.ReactElement {
  const widgetState = deriveAvatarWidgetState({
    isConnected,
    isAISpeaking,
    isUserSpeaking,
  });
  const isSpeakingActive = isConnected && (lipSyncAmplitude !== undefined || isAISpeaking);
  const measuredAmplitude = useAudioAmplitude(
    lipSyncAmplitude === undefined ? audioElement : null,
    lipSyncAmplitude === undefined && isSpeakingActive,
  );
  const amplitude = lipSyncAmplitude ?? measuredAmplitude;
  const talkingHeads = useTalkingHeadsAvatar(config, isConnected);

  const libraryEntry = config.glbLibraryId
    ? getAvatarLibraryEntry(config.glbLibraryId)
    : undefined;

  const lipSync = libraryEntry?.lipSync
    ? { ...libraryEntry.lipSync, mouthOpenGain: 0.78 }
    : { mouthOpenGain: 0.85, jawBones: ['jaw', 'Jaw', 'mixamorig:Jaw', 'Jawbone'] };

  // Real viseme-driven lip-sync when a timeline is available; otherwise the
  // GLB preview falls back to the generic amplitude envelope below.
  const hasVisemes = !!visemeTimeline && visemeTimeline.keyframes.length > 0;
  const visemeRef = useVisemePlayback(
    speechClock ?? NOOP_CLOCK,
    visemeTimeline,
    isConnected && hasVisemes && (isAISpeaking || amplitude > 0.035),
    lipSync,
  );

  const isDirectGlbUrl = config.glbLibraryId?.endsWith('.glb');
  // Fall back to a raw modelUrl (e.g. a publisher-uploaded model with no
  // matching avatar-library entry) so every GLB config renders through the
  // same GlbAvatarPreview pipeline — and therefore gets the same lip sync.
  const glbUrl =
    (isDirectGlbUrl ? config.glbLibraryId : libraryEntry?.glbPath) ??
    (config.modelUrl?.endsWith('.glb') ? config.modelUrl : undefined);

  const imageUrl =
    config.imageUrl ??
    libraryEntry?.thumbnailPath ??
    (config.glbLibraryId === 'avatar-2' || (isDirectGlbUrl && config.glbLibraryId?.includes('male'))
      ? '/images/sultan-emirati-reference.png'
      : '/images/salama-emirati-reference.png');

  const portrait = libraryEntry ? resolvePortraitPresentation(libraryEntry) : undefined;

  const useGlbPreview =
    (config.renderType === '3d' || config.renderType === 'glb') && Boolean(glbUrl);

  if (useGlbPreview && glbUrl) {
    const isSpeaking = isConnected && (isAISpeaking || amplitude > 0.035);

    return (
      <div className="flex h-full min-h-0 w-full flex-col bg-sidebar">
        <GlbAvatarPreview
          glbUrl={glbUrl}
          lipSyncHints={lipSync}
          amplitude={amplitude}
          visemeRef={visemeRef}
          isSpeaking={isSpeaking}
          showControls={false}
          framing="full"
          coverHeightFraction={libraryEntry?.previewCoverHeightFraction ?? 0.62}
          fitMargin={libraryEntry?.previewFitMargin ?? 1.08}
          modelScale={libraryEntry?.previewModelScale ?? 1.2}
        />
      </div>
    );
  }

  if (config.renderType === '3d' || config.renderType === 'glb') {
    return (
      <div className="flex h-full min-h-0 w-full flex-col bg-sidebar">
        <PortraitAvatarStage
          imageUrl={imageUrl}
          avatarName={config.avatarName}
          widgetState={widgetState}
          amplitude={amplitude}
          objectFit={portrait?.objectFit}
          objectPosition={portrait?.objectPosition}
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

