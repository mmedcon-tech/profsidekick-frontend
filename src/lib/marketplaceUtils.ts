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
  const languages = avatar.languages?.length ? avatar.languages : ['AR', 'EN'];
  const voices = avatar.voice_labels?.length ? avatar.voice_labels : ['shimmer'];

  const chips: string[] = [];
  for (const lang of languages) {
    for (const voice of voices) {
      chips.push(`${lang.toUpperCase()} · ${voice}`);
    }
  }
  return chips.slice(0, 4);
}

export function marketplaceStats(avatar: AvatarPublicResponse): {
  rating: number;
  courseCount: number;
  subscriberCount: number;
  creditsPerSession: number;
} {
  return {
    rating: avatar.rating ?? 4.8,
    courseCount: avatar.course_count ?? 0,
    subscriberCount: avatar.subscriber_count ?? 0,
    creditsPerSession: avatar.credits_per_session ?? 3,
  };
}

export function resolveMarketplaceGlbUrl(avatar: AvatarPublicResponse): string | null {
  if (avatar.glb_preview_url) return avatar.glb_preview_url;
  if (avatar.render_type === 'glb' && avatar.glb_library_id) {
    return `/avatars/${avatar.glb_library_id}.glb`;
  }
  return null;
}
