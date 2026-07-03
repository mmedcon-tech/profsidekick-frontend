import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { logVoiceUsage } from './voiceUsage';

const SUCCESS_BODY = { operation_type: 'tts_openai', credits_charged: '1.5', new_balance: '98.5' };

describe('logVoiceUsage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(SUCCESS_BODY), { status: 200 })),
    );
    vi.stubGlobal('crypto', { randomUUID: () => 'fixed-uuid' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does nothing when characterCount is zero or negative', async () => {
    const a = await logVoiceUsage('sess_1', 'run_1', 'elevenlabs', 0, 'tok');
    const b = await logVoiceUsage('sess_1', 'run_1', 'elevenlabs', -5, 'tok');
    expect(fetch).not.toHaveBeenCalled();
    expect(a).toEqual({ ok: true, insufficientCredits: false });
    expect(b).toEqual({ ok: true, insufficientCredits: false });
  });

  it('posts provider, character_count, and an idempotency_key', async () => {
    const result = await logVoiceUsage('sess_1', 'run_1', 'openai', 42, 'tok-abc');

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('/api/sessions/sess_1/runs/run_1/voice-usage');
    expect((options as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer tok-abc',
    });
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body).toEqual({
      provider: 'openai',
      character_count: 42,
      idempotency_key: 'fixed-uuid',
    });
    expect(result).toEqual({
      ok: true,
      insufficientCredits: false,
      creditsCharged: 1.5,
      newBalance: 98.5,
    });
  });

  it('omits the Authorization header when no token is available', async () => {
    await logVoiceUsage('sess_1', 'run_1', 'elevenlabs', 10, null);
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect((options as RequestInit).headers).not.toHaveProperty('Authorization');
  });

  it('does not throw when the request fails', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network down'));
    const result = await logVoiceUsage('sess_1', 'run_1', 'elevenlabs', 10, 'tok');
    expect(result).toEqual({ ok: false, insufficientCredits: false });
  });

  it('flags insufficientCredits on a 402 response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 402 }));
    const result = await logVoiceUsage('sess_1', 'run_1', 'elevenlabs', 10, 'tok');
    expect(result).toEqual({ ok: false, insufficientCredits: true });
  });

  it('reports a generic failure on other non-ok responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));
    const result = await logVoiceUsage('sess_1', 'run_1', 'elevenlabs', 10, 'tok');
    expect(result).toEqual({ ok: false, insufficientCredits: false });
  });
});
