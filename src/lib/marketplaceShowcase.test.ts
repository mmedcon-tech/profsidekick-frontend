import { describe, expect, it } from 'vitest';
import { avatarSupportsGlbShowcase, buildShowcaseEntryFromAvatar } from './marketplaceShowcase';
import type { AvatarPublicResponse } from '@/types/avatar';

const base: AvatarPublicResponse = {
  id: 'avatar-1',
  name: 'Salama',
  description: null,
  is_published: true,
  template_image_url: '/images/avatar-female.png',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  render_type: 'glb',
  glb_library_id: 'avatar-1',
};

describe('marketplaceShowcase', () => {
  it('builds showcase entry from GLB-linked avatar', () => {
    const entry = buildShowcaseEntryFromAvatar(base);
    expect(entry?.glbPath).toBe('/avatars/avatar-1.glb');
    expect(entry?.name).toBe('Salama');
  });

  it('detects GLB showcase support', () => {
    expect(avatarSupportsGlbShowcase(base)).toBe(true);
  });
});
