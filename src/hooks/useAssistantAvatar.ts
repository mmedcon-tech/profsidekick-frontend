'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAvatarLibraryEntry,
  getDefaultChatbotAvatar,
  type AvatarLibraryLipSyncHints,
} from '@/lib/avatarLibrary';
import { avatarApi, marketplaceApi, subscriptionApi } from '@/lib/avatarApi';
import { normalizeRole } from '@/lib/navigation';
import { resolveVoiceProfile, type VoiceGender, type VoiceProfile } from '@/lib/voiceProfiles';

/**
 * The fully-resolved avatar the floating assistant should render and speak as.
 * Derived from the user's own avatar (publisher), their subscribed avatar
 * (subscriber), or the default platform avatar when neither is available.
 */
export interface AssistantAvatar {
  name: string;
  glbUrl: string;
  posterSrc: string;
  framing: 'bust' | 'full';
  fitMargin: number;
  modelScale: number;
  /** Upper-body crop for full framing (smaller = larger on screen). */
  coverHeightFraction?: number;
  lipSync: AvatarLibraryLipSyncHints;
  voice: VoiceProfile;
  language: 'en' | 'ar';
  /** True when falling back to the platform default (no configured avatar). */
  isDefault: boolean;
}

function isGlbPath(value: string): boolean {
  return value.startsWith('http') || value.startsWith('/') || value.toLowerCase().endsWith('.glb');
}

function toLang(value?: string | string[] | null): 'en' | 'ar' {
  const raw = Array.isArray(value) ? value[0] : value;
  return /ar|عرب/i.test(raw ?? '') ? 'ar' : 'en';
}

function buildDefaultAvatar(): AssistantAvatar {
  const entry = getDefaultChatbotAvatar();
  const gender: VoiceGender = entry.gender === 'male' ? 'male' : 'female';
  return {
    name: entry.name,
    glbUrl: entry.glbPath,
    posterSrc: entry.thumbnailPath,
    framing: entry.previewFraming ?? 'bust',
    fitMargin: entry.previewFitMargin ?? 1.05,
    modelScale: entry.previewModelScale ?? 1.15,
    lipSync: entry.lipSync,
    voice: resolveVoiceProfile(undefined, gender),
    language: 'en',
    isDefault: true,
  };
}

interface BuildOpts {
  /** Library id (resolved against the avatar library for rig/framing hints). */
  glbLibraryId?: string | null;
  /** Direct GLB url (publisher-uploaded model) when not a library entry. */
  glbUrl?: string | null;
  name?: string;
  posterSrc?: string;
  voiceId?: string | null;
  language?: 'en' | 'ar';
  genderHint?: VoiceGender;
}

/** Build an AssistantAvatar from a config, preferring library metadata. */
function buildAvatar(opts: BuildOpts): AssistantAvatar {
  const entry = opts.glbLibraryId ? getAvatarLibraryEntry(opts.glbLibraryId) : undefined;
  const def = getDefaultChatbotAvatar();

  if (entry) {
    const gender: VoiceGender =
      opts.genderHint ?? (entry.gender === 'male' ? 'male' : 'female');
    return {
      name: opts.name ?? entry.name,
      glbUrl: entry.glbPath,
      posterSrc: opts.posterSrc ?? entry.thumbnailPath,
      framing: entry.previewFraming ?? 'full',
      fitMargin: entry.previewFitMargin ?? 1.05,
      modelScale: entry.previewModelScale ?? 1.15,
      lipSync: entry.lipSync,
      voice: resolveVoiceProfile(opts.voiceId, gender),
      language: opts.language ?? toLang(entry.languages),
      isDefault: false,
    };
  }

  // Not a known library entry — treat as a direct GLB url if it looks like one,
  // otherwise fall back to the default rig. Either way honour the voice config.
  const direct =
    opts.glbUrl && isGlbPath(opts.glbUrl)
      ? opts.glbUrl
      : opts.glbLibraryId && isGlbPath(opts.glbLibraryId)
        ? opts.glbLibraryId
        : null;
  const url = direct ?? def.glbPath;
  return {
    name: opts.name ?? def.name,
    glbUrl: url,
    posterSrc: opts.posterSrc ?? def.thumbnailPath,
    framing: 'full',
    fitMargin: 1.05,
    modelScale: 1.15,
    lipSync: def.lipSync,
    voice: resolveVoiceProfile(opts.voiceId, opts.genderHint ?? 'female'),
    language: opts.language ?? 'en',
    isDefault: url === def.glbPath && !opts.voiceId,
  };
}

async function resolveSubscriberAvatar(): Promise<AssistantAvatar | null> {
  const [list, subs] = await Promise.all([
    marketplaceApi.list().catch(() => ({ avatars: [], total: 0 })),
    subscriptionApi.list().catch(() => ({ subscriptions: [], total: 0 })),
  ]);

  const subscribedIds = new Set<string>(
    (subs.subscriptions ?? [])
      .map((s: { avatar_id?: string; avatarId?: string }) => s.avatar_id ?? s.avatarId ?? '')
      .filter(Boolean),
  );
  if (subscribedIds.size === 0) return null;

  const match = list.avatars.find(
    (a) => subscribedIds.has(a.id) || (a.glb_library_id != null && subscribedIds.has(a.glb_library_id)),
  );
  if (!match) return null;

  return buildAvatar({
    glbLibraryId: match.glb_library_id,
    glbUrl: match.glb_preview_url,
    name: match.name,
    posterSrc: match.template_image_url ?? match.glb_preview_url ?? undefined,
    voiceId: match.voice_labels?.[0],
    language: toLang(match.languages),
  });
}

async function resolvePublisherAvatar(): Promise<AssistantAvatar | null> {
  const list = await avatarApi.list().catch(() => ({ avatars: [], total: 0 }));
  const summaries = list.avatars ?? [];
  if (summaries.length === 0) return null;

  const chosen = summaries.find((a) => a.is_published) ?? summaries[0];
  const full = await avatarApi.get(chosen.id).catch(() => null);
  const cfg = full?.configuration ?? null;
  const settings = (cfg?.additional_settings ?? {}) as Record<string, unknown>;
  const glbLibraryId = typeof settings.glbLibraryId === 'string' ? settings.glbLibraryId : null;

  return buildAvatar({
    glbLibraryId,
    glbUrl: glbLibraryId,
    name: full?.name ?? chosen.name,
    posterSrc: chosen.template_image_url ?? undefined,
    voiceId: cfg?.voice,
    language: toLang(cfg?.language),
  });
}

/**
 * Resolve the active assistant avatar for the current user.
 *
 * - publisher → their own (first published) avatar + its configuration
 * - subscriber → the avatar they're subscribed to
 * - otherwise / on any failure → the default platform avatar
 *
 * Returns the default synchronously, then upgrades once the network resolves,
 * so the assistant is always usable.
 */
export function useAssistantAvatar(): { avatar: AssistantAvatar; loading: boolean } {
  const { user, token } = useAuth();
  const [avatar, setAvatar] = useState<AssistantAvatar>(buildDefaultAvatar);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      setAvatar(buildDefaultAvatar());
      return;
    }

    let cancelled = false;
    const role = normalizeRole(user.role);
    setLoading(true);

    (async () => {
      let resolved: AssistantAvatar | null = null;
      try {
        if (role === 'subscriber') resolved = await resolveSubscriberAvatar();
        else if (role === 'publisher') resolved = await resolvePublisherAvatar();
        // admin (and any unknown role) → default avatar
      } catch {
        resolved = null;
      }
      if (cancelled) return;
      setAvatar(resolved ?? buildDefaultAvatar());
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [token, user?.id, user?.role]);

  return { avatar, loading };
}
