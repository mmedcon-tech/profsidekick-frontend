import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

vi.mock('@/lib/config', () => ({
  config: {
    getApiUrl: (path: string) => `http://backend.test${path}`,
  },
}));

describe('POST /api/auth/refresh', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ token: 'new-tok', expiresAt: '2026-06-05T00:00:00Z' }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    );
  });

  it('forwards Authorization header to the backend refresh endpoint', async () => {
    const request = new NextRequest('http://localhost/api/auth/refresh', {
      method: 'POST',
      headers: { Authorization: 'Bearer tok123' },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.token).toBe('new-tok');
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/auth/refresh',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer tok123',
        }),
      }),
    );
  });
});
