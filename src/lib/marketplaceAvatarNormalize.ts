import { getAvatarLibrary } from '@/lib/avatarLibrary';
import type { AvatarLibraryEntry } from '@/lib/avatarLibrary';
import type { AvatarPublicListResponse, AvatarPublicResponse } from '@/types/avatar';

function pickString(raw: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function pickNumber(raw: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function pickBool(raw: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'boolean') return value;
  }
  return undefined;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function normalizeRenderType(value: unknown): AvatarPublicResponse['render_type'] | undefined {
  if (value === 'static' || value === 'talkingheads' || value === 'heygen' || value === 'glb') {
    return value;
  }
  return undefined;
}

export function normalizeAvatarPublicResponse(raw: unknown): AvatarPublicResponse | null {
  if (!raw || typeof raw !== 'object') return null;

  const record = raw as Record<string, unknown>;
  const id = pickString(record, 'id', 'avatar_id', 'avatarId');
  const name = pickString(record, 'name');
  if (!id || !name) return null;

  const createdAt =
    pickString(record, 'created_at', 'createdAt') ?? new Date().toISOString();
  const updatedAt =
    pickString(record, 'updated_at', 'updatedAt') ?? createdAt;

  return {
    id,
    name,
    description: pickString(record, 'description') ?? null,
    is_published: pickBool(record, 'is_published', 'isPublished') ?? true,
    template_image_url:
      pickString(record, 'template_image_url', 'templateImageUrl', 'image_url', 'imageUrl') ??
      null,
    subscription_cost: pickNumber(record, 'subscription_cost', 'subscriptionCost'),
    created_at: createdAt,
    updated_at: updatedAt,
    is_enrolled: pickBool(record, 'is_enrolled', 'isEnrolled'),
    rating: pickNumber(record, 'rating', 'average_rating', 'averageRating'),
    course_count: pickNumber(record, 'course_count', 'courseCount'),
    subscriber_count: pickNumber(record, 'subscriber_count', 'subscriberCount'),
    credits_per_session: pickNumber(record, 'credits_per_session', 'creditsPerSession'),
    languages: normalizeStringArray(record.languages ?? record.language_codes),
    voice_labels: normalizeStringArray(record.voice_labels ?? record.voiceLabels),
    tagline: pickString(record, 'tagline') ?? null,
    render_type: normalizeRenderType(record.render_type ?? record.renderType),
    glb_preview_url: pickString(record, 'glb_preview_url', 'glbPreviewUrl') ?? null,
    glb_library_id: pickString(record, 'glb_library_id', 'glbLibraryId') ?? null,
  };
}

export function normalizeAvatarPublicListResponse(raw: unknown): AvatarPublicListResponse {
  const record =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : ({} as Record<string, unknown>);

  const list = Array.isArray(record.avatars)
    ? record.avatars
    : Array.isArray(raw)
      ? raw
      : [];

  const avatars = list
    .map((item) => normalizeAvatarPublicResponse(item))
    .filter((item): item is AvatarPublicResponse => item !== null);

  const total =
    typeof record.total === 'number' && Number.isFinite(record.total)
      ? record.total
      : avatars.length;

  return { avatars, total };
}

export function libraryEntryToPublicAvatar(entry: AvatarLibraryEntry): AvatarPublicResponse {
  const now = new Date().toISOString();
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description ?? null,
    is_published: true,
    template_image_url: entry.thumbnailPath,
    subscription_cost: null,
    created_at: now,
    updated_at: now,
    tagline: entry.tagline ?? null,
    languages: entry.languages.map((lang) => lang.toUpperCase()),
    voice_labels: [entry.gender === 'male' ? 'cedar' : 'marin'],
    render_type: 'glb',
    glb_library_id: entry.id,
    glb_preview_url: entry.glbPath,
    rating: null,
    course_count: null,
    subscriber_count: null,
    credits_per_session: null,
  };
}

/** Append platform GLB avatars when the backend list omits them. */
export function enrichMarketplaceWithLibrary(
  response: AvatarPublicListResponse,
): AvatarPublicListResponse {
  const existingIds = new Set(response.avatars.map((avatar) => avatar.id));
  const existingLibraryIds = new Set(
    response.avatars
      .map((avatar) => avatar.glb_library_id)
      .filter((id): id is string => !!id),
  );

  const extras = getAvatarLibrary().avatars
    .filter((entry) => !existingIds.has(entry.id) && !existingLibraryIds.has(entry.id))
    .map((entry) => libraryEntryToPublicAvatar(entry));

  if (extras.length === 0) return response;

  return {
    avatars: [...response.avatars, ...extras],
    total: response.total + extras.length,
  };
}

export function resolveLibraryPublicAvatar(avatarId: string): AvatarPublicResponse | null {
  const entry = getAvatarLibrary().avatars.find((item) => item.id === avatarId);
  return entry ? libraryEntryToPublicAvatar(entry) : null;
}
