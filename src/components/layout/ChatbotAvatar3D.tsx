'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useSimulatedAmplitude } from '@/hooks/useSimulatedAmplitude';
import { getDefaultChatbotAvatar } from '@/lib/avatarLibrary';
import type { LipSyncHints } from '@/lib/glbLipSync';

const GlbAvatarPreview = dynamic(() => import('@/components/avatar/GlbAvatarPreview'), {
  ssr: false,
  loading: () => <ChatbotAvatarStatic size={120} />,
});

/** Minimal avatar appearance the 3D widget needs to render. */
export interface ChatbotAvatarConfig {
  glbUrl: string;
  posterSrc: string;
  framing?: 'bust' | 'full';
  fitMargin?: number;
  modelScale?: number;
  lipSync?: LipSyncHints;
}

interface ChatbotAvatar3DProps {
  size?: number;
  speaking?: boolean;
  /**
   * Fill the parent element instead of rendering a fixed-size circle.
   * Used by the floating assistant call view so the 3D avatar covers the
   * whole panel surface (controls are overlaid on top).
   */
  fill?: boolean;
  /** Avatar to render. Defaults to the platform default chatbot avatar. */
  avatar?: ChatbotAvatarConfig;
}

function defaultConfig(): ChatbotAvatarConfig {
  const avatar = getDefaultChatbotAvatar();
  return {
    glbUrl: avatar.glbPath,
    posterSrc: avatar.thumbnailPath,
    framing: avatar.previewFraming ?? 'bust',
    fitMargin: avatar.previewFitMargin ?? 1.05,
    modelScale: avatar.previewModelScale ?? 1.15,
    lipSync: avatar.lipSync,
  };
}

function ChatbotAvatarStatic({
  size = 120,
  posterSrc,
}: {
  size?: number;
  posterSrc?: string;
}): React.ReactElement {
  const avatar = getDefaultChatbotAvatar();

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-gradient-to-b from-[#1a2e24] to-[#070d0a]"
      style={{ width: size, height: size }}
    >
      <Image
        src={posterSrc ?? avatar.thumbnailPath}
        alt={avatar.name}
        width={size}
        height={size}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

/**
 * Warm the GLB cache for an avatar (defaults to the platform default). Safe to
 * call repeatedly; `useGLTF.preload` de-dupes. Call from an idle callback so the
 * model is ready the instant the user opens a call.
 */
export function preloadChatbotAvatar(glbUrl?: string): void {
  const url = glbUrl ?? getDefaultChatbotAvatar().glbPath;
  void import('@/components/avatar/GlbAvatarPreview').then((mod) => {
    mod.preloadGlbAvatar(url);
  });
}

export function ChatbotAvatar3D({
  size = 120,
  speaking = false,
  fill = false,
  avatar,
}: ChatbotAvatar3DProps): React.ReactElement {
  const cfg = avatar ?? defaultConfig();
  const amplitude = useSimulatedAmplitude(speaking);

  const preview = (
    <GlbAvatarPreview
      glbUrl={cfg.glbUrl}
      amplitude={amplitude}
      lipSyncHints={cfg.lipSync}
      posterSrc={cfg.posterSrc}
      showControls={false}
      framing={cfg.framing ?? 'bust'}
      fitMargin={cfg.fitMargin ?? 1.05}
      modelScale={cfg.modelScale ?? 1.15}
      className="h-full w-full"
    />
  );

  if (fill) {
    // Fill the entire parent. pointer-events-none lets clicks/drag pass
    // through to the controls overlaid on top and to the draggable header.
    return (
      <div className="pointer-events-none absolute inset-0" data-testid="chatbot-avatar-3d">
        {preview}
      </div>
    );
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full ring-1 ring-sidebar-border"
      style={{ width: size, height: size }}
      data-testid="chatbot-avatar-3d"
    >
      {preview}
      {speaking && (
        <span className="absolute bottom-1 end-1 z-10 flex h-3 w-3 items-center justify-center rounded-full bg-accent ring-2 ring-card">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-foreground" />
        </span>
      )}
    </div>
  );
}

export { ChatbotAvatarStatic };
