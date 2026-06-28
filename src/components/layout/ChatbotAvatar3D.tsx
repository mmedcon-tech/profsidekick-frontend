'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useSimulatedAmplitude } from '@/hooks/useSimulatedAmplitude';
import { getDefaultChatbotAvatar } from '@/lib/avatarLibrary';

const GlbAvatarPreview = dynamic(() => import('@/components/avatar/GlbAvatarPreview'), {
  ssr: false,
  loading: () => <ChatbotAvatarStatic size={120} />,
});

interface ChatbotAvatar3DProps {
  size?: number;
  speaking?: boolean;
  /**
   * Fill the parent element instead of rendering a fixed-size circle.
   * Used by the floating assistant call view so the 3D avatar covers the
   * whole panel surface (controls are overlaid on top).
   */
  fill?: boolean;
}

function ChatbotAvatarStatic({ size = 120 }: { size?: number }): React.ReactElement {
  const avatar = getDefaultChatbotAvatar();

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-gradient-to-b from-[#1a2e24] to-[#070d0a]"
      style={{ width: size, height: size }}
    >
      <Image
        src={avatar.thumbnailPath}
        alt={avatar.name}
        width={size}
        height={size}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

/**
 * Warm the GLB cache for the default chatbot avatar. Safe to call repeatedly;
 * `useGLTF.preload` de-dupes. Call from an idle callback so the model is ready
 * the instant the user opens a call.
 */
export function preloadChatbotAvatar(): void {
  const avatar = getDefaultChatbotAvatar();
  void import('@/components/avatar/GlbAvatarPreview').then((mod) => {
    mod.preloadGlbAvatar(avatar.glbPath);
  });
}

export function ChatbotAvatar3D({
  size = 120,
  speaking = false,
  fill = false,
}: ChatbotAvatar3DProps): React.ReactElement {
  const avatar = getDefaultChatbotAvatar();
  const amplitude = useSimulatedAmplitude(speaking);

  const preview = (
    <GlbAvatarPreview
      glbUrl={avatar.glbPath}
      amplitude={amplitude}
      lipSyncHints={avatar.lipSync}
      posterSrc={avatar.thumbnailPath}
      showControls={false}
      framing={avatar.previewFraming ?? 'bust'}
      fitMargin={avatar.previewFitMargin ?? 1.05}
      modelScale={avatar.previewModelScale ?? 1.15}
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
