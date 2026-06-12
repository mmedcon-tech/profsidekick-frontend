import { describe, expect, it } from 'vitest';
import {
  buildDeliveryModeChips,
  formatMarketplaceStat,
  mergeEnrollmentState,
  marketplaceStats,
  resolveMarketplaceGlbUrl,
} from './marketplaceUtils';
import type { AvatarPublicResponse } from '@/types/avatar';

const baseAvatar: AvatarPublicResponse = {
  id: 'av-1',
  name: 'Test',
  description: null,
  is_published: true,
  template_image_url: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('marketplaceUtils', () => {
  it('merges subscription ids into is_enrolled', () => {
    const merged = mergeEnrollmentState([baseAvatar], new Set(['av-1']));
    expect(merged[0]?.is_enrolled).toBe(true);
  });

  it('builds language/voice chips from library metadata when backend omits them', () => {
    const chips = buildDeliveryModeChips({
      ...baseAvatar,
      glb_library_id: 'avatar-1',
    });
    expect(chips).toContain('AR · marin');
    expect(chips).toContain('EN · marin');
  });

  it('returns null stats when backend omits values', () => {
    const stats = marketplaceStats(baseAvatar);
    expect(stats.rating).toBeNull();
    expect(stats.courseCount).toBeNull();
  });

  it('formats missing stats as em dash', () => {
    expect(formatMarketplaceStat(null)).toBe('—');
    expect(formatMarketplaceStat(4)).toBe('4');
  });

  it('resolves glb preview url from library id', () => {
    const url = resolveMarketplaceGlbUrl({
      ...baseAvatar,
      render_type: 'glb',
      glb_library_id: 'avatar-1',
    });
    expect(url).toBe('/avatars/avatar-1.glb');
  });
});
