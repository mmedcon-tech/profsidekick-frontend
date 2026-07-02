import { getAvatarLibraryEntry } from '@/lib/avatarLibrary';
import type { AvatarPublicResponse } from '@/types/avatar';

export function mergeEnrollmentState(
  avatars: AvatarPublicResponse[],
  subscribedAvatarIds: Set<string>,
): AvatarPublicResponse[] {
  return avatars.map((avatar) => ({
    ...avatar,
    is_enrolled: avatar.is_enrolled ?? subscribedAvatarIds.has(avatar.id),
  }));
}

export function buildDeliveryModeChips(avatar: AvatarPublicResponse): string[] {
  const libraryEntry = avatar.glb_library_id
    ? getAvatarLibraryEntry(avatar.glb_library_id)
    : undefined;

  const languages = avatar.languages?.length
    ? avatar.languages
    : libraryEntry?.languages.map((lang) => lang.toUpperCase()) ?? [];

  const voices = avatar.voice_labels?.length
    ? avatar.voice_labels
    : libraryEntry
      ? [libraryEntry.gender === 'male' ? 'cedar' : 'marin']
      : [];

  if (languages.length === 0 || voices.length === 0) return [];

  const chips: string[] = [];
  for (const lang of languages) {
    for (const voice of voices) {
      chips.push(`${lang.toUpperCase()} · ${voice}`);
    }
  }
  return chips.slice(0, 4);
}

export interface MarketplaceStatValues {
  rating: number | null;
  courseCount: number | null;
  subscriberCount: number | null;
  creditsPerSession: number | null;
}

export function marketplaceStats(avatar: AvatarPublicResponse): MarketplaceStatValues {
  return {
    rating: avatar.rating ?? null,
    courseCount: avatar.course_count ?? null,
    subscriberCount: avatar.subscriber_count ?? null,
    creditsPerSession: avatar.credits_per_session ?? null,
  };
}

export function formatMarketplaceStat(value: number | null, suffix = ''): string {
  if (value === null) return '—';
  return `${value}${suffix}`;
}

export function resolveMarketplaceGlbUrl(avatar: AvatarPublicResponse): string | null {
  if (avatar.glb_preview_url) return avatar.glb_preview_url;
  if (avatar.glb_library_id) {
    const entry = getAvatarLibraryEntry(avatar.glb_library_id);
    if (entry) return entry.glbPath;
    return `/avatars/${avatar.glb_library_id}.glb`;
  }
  if (avatar.render_type === 'glb') {
    return `/avatars/${avatar.id}.glb`;
  }
  return null;
}

export function isPlatformLibraryAvatar(
  avatar: Pick<AvatarPublicResponse, 'id' | 'glb_library_id'>,
): boolean {
  if (getAvatarLibraryEntry(avatar.id)) return true;
  if (avatar.glb_library_id && getAvatarLibraryEntry(avatar.glb_library_id)) return true;
  return false;
}

export function isPlatformLibraryAvatarId(avatarId: string): boolean {
  return !!getAvatarLibraryEntry(avatarId);
}
