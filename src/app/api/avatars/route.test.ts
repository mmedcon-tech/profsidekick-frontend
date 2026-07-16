import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET } from './route';

vi.mock('@/lib/proxyAuth', () => ({
  proxyToBackend: vi.fn(),
}));

import { proxyToBackend } from '@/lib/proxyAuth';

describe('GET /api/avatars', () => {
  beforeEach(() => {
    vi.mocked(proxyToBackend).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('enriches normalized backend avatars with library entries', async () => {
    vi.mocked(proxyToBackend).mockResolvedValue(
      NextResponse.json({
          avatars: [
            {
              id: 'pub-1',
              name: 'Publisher Avatar',
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
              rating: 4.9,
              course_count: 3,
            },
          ],
          total: 1,
        }),
    );

    const request = new NextRequest('http://localhost/api/avatars', {
      headers: { Authorization: 'Bearer test' },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.avatars.some((avatar: { id: string }) => avatar.id === 'pub-1')).toBe(true);
    expect(body.avatars.some((avatar: { id: string }) => avatar.id === 'avatar-1')).toBe(true);
    expect(body.avatars.find((avatar: { id: string }) => avatar.id === 'pub-1')?.rating).toBe(4.9);
  });

  it('returns library avatars when backend is unavailable', async () => {
    vi.mocked(proxyToBackend).mockResolvedValue(
      NextResponse.json({ detail: 'Unavailable' }, { status: 503 }),
    );

    const request = new NextRequest('http://localhost/api/avatars', {
      headers: { Authorization: 'Bearer test' },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.avatars.length).toBeGreaterThanOrEqual(2);
  });
});
