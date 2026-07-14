import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

describe('POST /api/speech/preview', () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
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
    process.env.OPENAI_API_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it('returns 503 when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    const request = new NextRequest('http://localhost/api/speech/preview', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello', gender: 'female' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(503);
  });

  it('proxies speech to OpenAI and returns audio', async () => {
    const request = new NextRequest('http://localhost/api/speech/preview', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello Aisha', gender: 'male' }),
    });

    const response = await POST(request);
    const buffer = await response.arrayBuffer();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(buffer.byteLength).toBe(3);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/audio/speech',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      }),
    );
  });

  it('uses an explicit voice id over the gender-based pick when provided', async () => {
    const request = new NextRequest('http://localhost/api/speech/preview', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello', gender: 'female', voice: 'ash' }),
    });

    await POST(request);

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const sentBody = JSON.parse(options.body as string);
    expect(sentBody.voice).toBe('ash');
  });
});
