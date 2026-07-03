import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ElevenLabsSynthesisError, synthesizeElevenLabsSpeech } from './playElevenLabsAudio';

describe('synthesizeElevenLabsSpeech', () => {
  beforeEach(() => {
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
    vi.unstubAllGlobals();
  });

  it('forwards an explicit voiceId to the BFF route', async () => {
    await synthesizeElevenLabsSpeech('Hello', 'male', 'adult', 'explicit-voice-id');

    const [, options] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.voiceId).toBe('explicit-voice-id');
  });

  it('omits voiceId when not provided', async () => {
    await synthesizeElevenLabsSpeech('Hello', 'male', 'adult');

    const [, options] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.voiceId).toBeUndefined();
  });

  it('throws when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('boom', { status: 500 }),
    );
    await expect(synthesizeElevenLabsSpeech('Hello', 'male')).rejects.toThrow('boom');
  });

  it('throws an ElevenLabsSynthesisError classified platform_quota_exceeded when the route reports it', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: 'quota exceeded', errorCode: 'platform_quota_exceeded' }),
        { status: 401 },
      ),
    );

    const err = await synthesizeElevenLabsSpeech('Hello', 'male').catch((e) => e);
    expect(err).toBeInstanceOf(ElevenLabsSynthesisError);
    expect((err as ElevenLabsSynthesisError).errorCode).toBe('platform_quota_exceeded');
  });

  it('defaults errorCode to unknown for an unclassified failure', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('boom', { status: 500 }));

    const err = await synthesizeElevenLabsSpeech('Hello', 'male').catch((e) => e);
    expect(err).toBeInstanceOf(ElevenLabsSynthesisError);
    expect((err as ElevenLabsSynthesisError).errorCode).toBe('unknown');
  });
});
