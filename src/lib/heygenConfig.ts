import type { SessionAvatarConfig } from '@/types/types';

/**
 * HeyGen is paused until the team enables it explicitly.
 * Set NEXT_PUBLIC_HEYGEN_ENABLED=true once HEYGEN_API_KEY is configured server-side.
 */
export function isHeyGenEnabled(): boolean {
  return process.env.NEXT_PUBLIC_HEYGEN_ENABLED === 'true';
}

export function isHeyGenAvatarIdsConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID_FEMALE ||
    process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID_MALE
  );
}

export function shouldUseHeyGenVideo(config: SessionAvatarConfig): boolean {
  if (!isHeyGenEnabled()) return false;
  if (config.renderType !== 'heygen') return false;
  return !!(
    config.heygenAvatarId || isHeyGenAvatarIdsConfigured()
  );
}

/** Maps heygen → static fallback while HeyGen integration is paused. */
export function getEffectiveRenderType(
  config: SessionAvatarConfig,
): SessionAvatarConfig['renderType'] {
  if (config.renderType === 'heygen' && !isHeyGenEnabled()) {
    return 'static';
  }
  return config.renderType;
}

export function getAvatarModeLabel(renderType: SessionAvatarConfig['renderType']): string {
  switch (renderType) {
    case 'heygen':
      return 'Realistic (HeyGen)';
    case 'talkingheads':
      return 'Animated (TalkingHeads)';
    case '3d':
      return '3D Avatar';
    default:
      return 'Static photo';
  }
}
