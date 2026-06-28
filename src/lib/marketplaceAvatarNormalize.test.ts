import { describe, expect, it } from 'vitest';
import {
  enrichMarketplaceWithLibrary,
  libraryEntryToPublicAvatar,
  normalizeAvatarPublicListResponse,
  normalizeAvatarPublicResponse,
  resolveLibraryPublicAvatar,
} from './marketplaceAvatarNormalize';
import { getAvatarLibraryEntry } from './avatarLibrary';

describe('marketplaceAvatarNormalize', () => {
  it('normalizes snake_case and camelCase marketplace fields', () => {
    const avatar = normalizeAvatarPublicResponse({
      id: 'av-1',
      name: 'Salama',
      templateImageUrl: '/img.png',
      averageRating: 4.6,
      courseCount: 2,
      subscriberCount: 18,
      creditsPerSession: 5,
      languages: ['AR', 'EN'],
      voiceLabels: ['marin'],
      renderType: 'glb',
      glbLibraryId: 'avatar-1',
      isEnrolled: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    });

    expect(avatar?.rating).toBe(4.6);
    expect(avatar?.course_count).toBe(2);
    expect(avatar?.subscriber_count).toBe(18);
    expect(avatar?.credits_per_session).toBe(5);
    expect(avatar?.glb_library_id).toBe('avatar-1');
    expect(avatar?.is_enrolled).toBe(true);
  });

  it('normalizes list payloads', () => {
    const list = normalizeAvatarPublicListResponse({
      avatars: [{ id: '1', name: 'A', created_at: '2026-01-01', updated_at: '2026-01-01' }],
      total: 1,
    });
    expect(list.avatars).toHaveLength(1);
    expect(list.total).toBe(1);
  });

  it('maps library entries to public avatars', () => {
    const entry = getAvatarLibraryEntry('avatar-2');
    expect(entry).toBeDefined();
    const avatar = libraryEntryToPublicAvatar(entry!);
    expect(avatar.render_type).toBe('glb');
    expect(avatar.glb_library_id).toBe('avatar-2');
  });

  it('enriches backend list with missing library avatars', () => {
    const enriched = enrichMarketplaceWithLibrary({ avatars: [], total: 0 });
    expect(enriched.avatars.length).toBeGreaterThanOrEqual(2);
  });

  it('resolves library avatars by id', () => {
    expect(resolveLibraryPublicAvatar('avatar-1')?.name).toBe('Salama');
  });
});
