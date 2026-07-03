import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVoicePreferences } from './useVoicePreferences';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

const RESOLUTION_BODY = {
  preference: null,
  resolved: {
    provider: 'elevenlabs',
    voice_id: 'rachel',
    dialect: 'en-US',
    source: 'publisher',
  },
};

describe('useVoicePreferences', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(RESOLUTION_BODY), { status: 200 })),
    );
  });

  it('fetches the resolved voice on mount', async () => {
    const { result } = renderHook(() => useVoicePreferences());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.resolved.provider).toBe('elevenlabs');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/voice-preferences'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('saveOverride PUTs the chosen voice and refetches', async () => {
    const { result } = renderHook(() => useVoicePreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: { success: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.saveOverride('openai', 'nova', 'en-US');
    });

    expect(outcome?.success).toBe(true);
    const putCall = vi.mocked(fetch).mock.calls.find(([, opts]) => opts?.method === 'PUT');
    expect(putCall).toBeDefined();
    const body = JSON.parse((putCall![1] as RequestInit).body as string);
    expect(body).toEqual({ provider: 'openai', voice_id: 'nova', dialect: 'en-US' });
  });

  it('saveOverride surfaces a validation error from the backend', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(RESOLUTION_BODY), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'not a valid voice' }), { status: 422 }),
      );
    const { result } = renderHook(() => useVoicePreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: { success: boolean; error?: string } | undefined;
    await act(async () => {
      outcome = await result.current.saveOverride('openai', 'not-a-voice');
    });

    expect(outcome?.success).toBe(false);
    expect(outcome?.error).toBe('not a valid voice');
  });

  it('clearOverride DELETEs and refetches', async () => {
    const { result } = renderHook(() => useVoicePreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

    let outcome: { success: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.clearOverride();
    });

    expect(outcome?.success).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/voice-preferences'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
