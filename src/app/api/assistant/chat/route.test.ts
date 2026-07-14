import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

describe('POST /api/assistant/chat', () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: 'Hello from the assistant.' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
  });

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it('proxies to backend when OPENAI_API_KEY is missing locally', async () => {
    delete process.env.OPENAI_API_KEY;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ reply: 'Economics is the study of scarcity.' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const request = new NextRequest('http://localhost/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'What is economics?' }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reply).toBe('Economics is the study of scarcity.');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/assistant/chat',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns 503 when no local key and backend is unavailable', async () => {
    delete process.env.OPENAI_API_KEY;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(null));

    const request = new NextRequest('http://localhost/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hi' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(503);
  });

  it('uses shorter call-mode settings when responseMode is call', async () => {
    const request = new NextRequest('http://localhost/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Explain quantum physics',
        responseMode: 'call',
      }),
    });

    await POST(request);

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { body: string },
    ];
    const payload = JSON.parse(init.body) as {
      max_tokens: number;
      temperature: number;
      messages: Array<{ role: string; content: string }>;
    };
    expect(payload.max_tokens).toBe(90);
    expect(payload.temperature).toBe(0.55);
    expect(payload.messages[0].content).toContain('one or two short spoken sentences');
  });

  it('proxies chat to OpenAI and returns reply', async () => {
    const request = new NextRequest('http://localhost/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'What courses do I have?',
        systemPrompt: 'You are Salama.',
        history: [{ role: 'user', text: 'Hello' }],
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reply).toBe('Hello from the assistant.');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      }),
    );
  });
});
