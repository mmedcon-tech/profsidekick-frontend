import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

vi.mock('@/lib/config', () => ({
  config: {
    getApiUrl: (path: string) => `http://backend.test${path}`,
  },
}));

describe('POST /api/sessions/[sessionId]/run/[sessionRunId]/transcript', () => {
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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('proxies transcript turns to the backend', async () => {
    const request = new NextRequest(
      'http://localhost/api/sessions/s1/run/r1/transcript',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'assistant', text: 'Welcome to the session.' }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ sessionId: 's1', sessionRunId: 'r1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/sessions/s1/run/r1/transcript',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
  });
});
