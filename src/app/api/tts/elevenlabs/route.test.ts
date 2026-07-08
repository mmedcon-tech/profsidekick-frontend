import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

describe('POST /api/tts/elevenlabs', () => {
  const originalKey = process.env.ELEVENLABS_API_KEY;

  beforeEach(() => {
    process.env.ELEVENLABS_API_KEY = 'test-eleven-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { 'Content-Type': 'audio/mpeg' },
        }),
      ),
    );
  });

  afterEach(() => {
    process.env.ELEVENLABS_API_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it('returns 503 when ELEVENLABS_API_KEY is missing', async () => {
    delete process.env.ELEVENLABS_API_KEY;
    // Backend proxy unavailable so the handler falls through to direct synthesis.
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 404 }));
    const request = new NextRequest('http://localhost/api/tts/elevenlabs', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello', gender: 'male' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(503);
  });

  it('synthesizes speech through ElevenLabs when backend route is unavailable', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 404 }));

    const request = new NextRequest('http://localhost/api/tts/elevenlabs', {
      method: 'POST',
      body: JSON.stringify({ text: 'Marhaba', gender: 'male' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.elevenlabs.io/v1/text-to-speech/'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'xi-api-key': 'test-eleven-key',
        }),
      }),
    );
  });
});
