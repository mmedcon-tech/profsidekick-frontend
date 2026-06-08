import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

vi.mock('@/lib/config', () => ({
  config: {
    getApiUrl: (path: string) => `http://backend.test${path}`,
  },
}));

describe('GET /api/auth/verify', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ user: { id: '1', username: 'u1' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
  });

  it('forwards Authorization to verify-token on the backend', async () => {
    const request = new NextRequest('http://localhost/api/auth/verify', {
      method: 'GET',
      headers: { Authorization: 'Bearer tok123' },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/auth/verify-token',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer tok123',
        }),
      }),
    );
  });
});
