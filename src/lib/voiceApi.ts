/**
 * Typed client for the dual voice pipeline's catalog endpoint.
 * Mirrors the fetch conventions in `avatarApi.ts` (auth token from
 * localStorage, throws ApiError with `.status` on non-2xx responses).
 */

import { config } from './config';
import { ApiError } from './avatarApi';
import type { TtsProvider, VoiceCatalogResponse } from '@/types/avatar';

async function req<T>(endpoint: string): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(config.getApiUrl(endpoint), { headers });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      json.message || json.detail || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }

  return json as T;
}

export const voiceApi = {
  getCatalog: (provider: TtsProvider) =>
    req<VoiceCatalogResponse>(`/api/voice-catalog?provider=${provider}`),
};
