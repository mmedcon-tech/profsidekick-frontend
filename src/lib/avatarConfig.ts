import type {
  AvatarRenderType,
  EphemeralTokenResponse,
  SessionAvatarConfig,
} from '@/types/types';

const DEFAULT_AVATAR_NAME = 'Teaching Assistant';

export function resolveAvatarConfig(
  response: EphemeralTokenResponse,
  fallback?: Partial<SessionAvatarConfig>,
): SessionAvatarConfig {
  const renderType: AvatarRenderType =
    response.avatar_render_type ??
    fallback?.renderType ??
    (response.heygen_avatar_id ? 'heygen' : 'static');

  return {
    renderType,
    avatarId: fallback?.avatarId,
    avatarName:
      response.avatar_name ?? fallback?.avatarName ?? DEFAULT_AVATAR_NAME,
    imageUrl: response.avatar_image_url ?? fallback?.imageUrl,
    heygenAvatarId: response.heygen_avatar_id ?? fallback?.heygenAvatarId ?? null,
    heygenQuality: response.heygen_quality ?? fallback?.heygenQuality ?? 'high',
    heygenAccessToken:
      response.heygen_access_token ?? fallback?.heygenAccessToken ?? null,
    sessionLanguage:
      response.session_language ?? fallback?.sessionLanguage ?? 'en',
    sessionMode:
      response.session_mode ?? fallback?.sessionMode ?? 'teaching',
  };
}

export function parseSessionRunAvatar(
  run: Partial<{
    avatarId: string;
    avatarName: string;
    avatarImageUrl: string;
    avatarRenderType: AvatarRenderType;
    heygenAvatarId: string | null;
    sessionLanguage: string;
    sessionMode: 'teaching' | 'examination';
  }>,
): SessionAvatarConfig {
  return {
    renderType: run.avatarRenderType ?? 'static',
    avatarId: run.avatarId,
    avatarName: run.avatarName ?? DEFAULT_AVATAR_NAME,
    imageUrl: run.avatarImageUrl,
    heygenAvatarId: run.heygenAvatarId ?? null,
    heygenQuality: 'high',
    sessionLanguage: run.sessionLanguage ?? 'en',
    sessionMode: run.sessionMode ?? 'teaching',
  };
}

export function shouldUseHeyGenVideo(config: SessionAvatarConfig): boolean {
  if (config.renderType === 'static' || config.renderType === 'talkingheads') {
    return false;
  }
  return !!(
    config.heygenAvatarId ||
    process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID_FEMALE ||
    process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID_MALE
  );
}
