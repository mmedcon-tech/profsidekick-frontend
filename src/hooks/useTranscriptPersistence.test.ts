import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTranscriptPersistence } from './useTranscriptPersistence';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

describe('useTranscriptPersistence', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 })),
    );
  });

  it('posts completed transcript turns to the BFF route', async () => {
    const { result } = renderHook(() => useTranscriptPersistence('session-1', 'run-1'));

    await act(async () => {
      await result.current({ role: 'user', text: 'Can you explain slide two?' });
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/sessions/session-1/run/run-1/transcript',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
  });
});
