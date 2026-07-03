import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVoiceProviderAvailability } from './useVoiceProviderAvailability';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

const AVAILABILITY_BODY = {
  openai: { available: true, reason: null },
  elevenlabs: { available: false, reason: 'platform_quota_exceeded' },
};

describe('useVoiceProviderAvailability', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(AVAILABILITY_BODY), { status: 200 })),
    );
  });

  it('fetches provider availability on mount', async () => {
    const { result } = renderHook(() => useVoiceProviderAvailability());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.availability?.openai.available).toBe(true);
    expect(result.current.availability?.elevenlabs.available).toBe(false);
    expect(result.current.availability?.elevenlabs.reason).toBe('platform_quota_exceeded');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/voice-availability'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('surfaces a fetch error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));
    const { result } = renderHook(() => useVoiceProviderAvailability());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.availability).toBeNull();
  });
});
