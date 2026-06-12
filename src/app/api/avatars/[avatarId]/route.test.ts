import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET } from './route';

vi.mock('@/lib/proxyAuth', () => ({
  proxyToBackend: vi.fn(),
}));

import { proxyToBackend } from '@/lib/proxyAuth';

describe('GET /api/avatars/[avatarId]', () => {
  beforeEach(() => {
    vi.mocked(proxyToBackend).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns library avatar when backend misses platform GLB id', async () => {
    vi.mocked(proxyToBackend).mockResolvedValue(
      NextResponse.json({ detail: 'Not found' }, { status: 404 }),
    );

    const request = new NextRequest('http://localhost/api/avatars/avatar-1', {
      headers: { Authorization: 'Bearer test' },
    });

    const response = await GET(request, {
      params: Promise.resolve({ avatarId: 'avatar-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.name).toBe('Salama');
    expect(body.glb_library_id).toBe('avatar-1');
  });
});
