import { resolveGlbUrl } from '@/lib/avatarLibrary';
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

  const glbLibraryId =
    response.avatar_library_id ?? fallback?.glbLibraryId ?? null;
  const glbModelUrl = resolveGlbUrl(
    response.avatar_model_url ?? fallback?.glbModelUrl ?? null,
    glbLibraryId,
  );

  return {
    renderType,
    avatarId: fallback?.avatarId,
    avatarName:
      response.avatar_name ?? fallback?.avatarName ?? DEFAULT_AVATAR_NAME,
    imageUrl: response.avatar_image_url ?? fallback?.imageUrl,
    glbModelUrl: renderType === 'glb' ? glbModelUrl : fallback?.glbModelUrl,
    glbLibraryId: glbLibraryId ?? undefined,
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

export {
  getAvatarModeLabel,
  getEffectiveRenderType,
  isHeyGenEnabled,
  shouldUseHeyGenVideo,
} from '@/lib/heygenConfig';
