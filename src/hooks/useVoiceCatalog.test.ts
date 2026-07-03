import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVoiceCatalog } from './useVoiceCatalog';
import type { VoiceProvider } from '@/types/types';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

const CATALOG_BODY = {
  provider: 'openai',
  voices: [{ id: 'alloy', name: 'Alloy', dialects: ['en'] }],
  cost_per_1k_characters_usd: '0.015000',
};

describe('useVoiceCatalog', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(CATALOG_BODY), { status: 200 })),
    );
  });

  it('fetches the catalog for the given provider', async () => {
    const { result } = renderHook(() => useVoiceCatalog('openai'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.catalog?.voices).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/voice-catalog?provider=openai'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('does not fetch when provider is null', () => {
    renderHook(() => useVoiceCatalog(null));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refetches when the provider changes', async () => {
    const { result, rerender } = renderHook<
      ReturnType<typeof useVoiceCatalog>,
      { provider: VoiceProvider }
    >(({ provider }) => useVoiceCatalog(provider), {
      initialProps: { provider: 'openai' },
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          provider: 'elevenlabs',
          voices: [{ id: 'rachel', name: 'Rachel', dialects: ['en', 'ar'] }],
          cost_per_1k_characters_usd: '0.180000',
        }),
        { status: 200 },
      ),
    );
    rerender({ provider: 'elevenlabs' });

    await waitFor(() => expect(result.current.catalog?.provider).toBe('elevenlabs'));
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/voice-catalog?provider=elevenlabs'),
      expect.anything(),
    );
  });

  it('surfaces a fetch error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));
    const { result } = renderHook(() => useVoiceCatalog('openai'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.catalog).toBeNull();
  });
});
