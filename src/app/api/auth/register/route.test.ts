import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('proxies camelCase body to backend with publisher/subscriber roles unchanged', async () => {
    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: 'janedoe',
        email: 'jane@example.com',
        password: 'secret123',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'publisher',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          username: 'janedoe',
          email: 'jane@example.com',
          password: 'secret123',
          firstName: 'Jane',
          lastName: 'Doe',
          role: 'publisher',
        }),
      }),
    );
  });
});
