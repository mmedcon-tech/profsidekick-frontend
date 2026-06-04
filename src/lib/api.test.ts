import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiFetch,
  ApiError,
  registerApiAuthHandlers,
  resetApiAuthHandlers,
} from './api';

describe('apiFetch', () => {
  const refreshToken = vi.fn();
  const getToken = vi.fn();
  const clearAuthAndRedirect = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    registerApiAuthHandlers({
      refreshToken,
      getToken,
      clearAuthAndRedirect,
    });
    refreshToken.mockReset();
    getToken.mockReset();
    clearAuthAndRedirect.mockReset();
  });

  afterEach(() => {
    resetApiAuthHandlers();
    vi.unstubAllGlobals();
  });

  it('returns JSON on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const data = await apiFetch<{ ok: boolean }>('/api/test', { token: 't1' });
    expect(data).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('on 401 refreshes token, retries once with new token, and succeeds', async () => {
    refreshToken.mockResolvedValue(undefined);
    getToken.mockReturnValue('new-token');

    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ balance: 10 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const data = await apiFetch<{ balance: number }>('/api/billing/balance', {
      token: 'old-token',
    });

    expect(data).toEqual({ balance: 10 });
    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);

    const retryCall = vi.mocked(fetch).mock.calls[1];
    const retryHeaders = new Headers(retryCall[1]?.headers);
    expect(retryHeaders.get('Authorization')).toBe('Bearer new-token');
  });

  it('on second 401 clears auth and redirects without further retries', async () => {
    refreshToken.mockResolvedValue(undefined);
    getToken.mockReturnValue('new-token');

    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('', { status: 401 }));

    await expect(
      apiFetch('/api/billing/balance', { token: 'old-token' }),
    ).rejects.toMatchObject({ status: 401 });

    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(clearAuthAndRedirect).toHaveBeenCalledTimes(1);
  });

  it('does not retry when refresh fails', async () => {
    refreshToken.mockRejectedValue(new Error('refresh failed'));

    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 401 }));

    await expect(apiFetch('/api/test', { token: 't1' })).rejects.toBeInstanceOf(
      ApiError,
    );

    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(clearAuthAndRedirect).toHaveBeenCalledTimes(1);
  });

  it('throws 401 without refresh when auth handlers are not registered', async () => {
    resetApiAuthHandlers();

    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 401 }));

    await expect(apiFetch('/api/test', { token: 't1' })).rejects.toMatchObject({
      status: 401,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
