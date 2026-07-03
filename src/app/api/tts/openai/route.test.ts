import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

describe('POST /api/tts/openai', () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
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
    // Backend proxy unavailable so the handler falls through to direct synthesis.
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 404 }));
    const request = new NextRequest('http://localhost/api/tts/openai', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello', voiceId: 'alloy' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(503);
  });

  it('returns 400 when text is missing', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 404 }));
    const request = new NextRequest('http://localhost/api/tts/openai', {
      method: 'POST',
      body: JSON.stringify({ voiceId: 'alloy' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('synthesizes speech through OpenAI when the backend route is unavailable', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 404 }));

    const request = new NextRequest('http://localhost/api/tts/openai', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello there', voiceId: 'nova' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/audio/speech',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-openai-key',
        }),
      }),
    );
    const [, options] = vi.mocked(fetch).mock.calls[1];
    const sentBody = JSON.parse((options as RequestInit).body as string);
    expect(sentBody.voice).toBe('nova');
  });

  it('uses the backend proxy response when it succeeds', async () => {
    const request = new NextRequest('http://localhost/api/tts/openai', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello there', voiceId: 'nova' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1); // never fell through to OpenAI direct call
  });
});
