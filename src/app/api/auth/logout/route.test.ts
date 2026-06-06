import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

vi.mock('@/lib/config', () => ({
  config: {
    getApiUrl: (path: string) => `http://backend.test${path}`,
  },
}));

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
  });

  it('forwards Authorization header to the backend', async () => {
    const request = new NextRequest('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: 'Bearer tok123' },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/auth/logout',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer tok123',
        }),
      }),
    );
  });

  it('returns 401 when Authorization header is missing', async () => {
    const request = new NextRequest('http://localhost/api/auth/logout', {
      method: 'POST',
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
