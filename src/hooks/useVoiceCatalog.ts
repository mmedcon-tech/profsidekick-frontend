import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';
import type { VoiceCatalogResponse, VoiceProvider } from '@/types/types';

interface UseVoiceCatalogReturn {
  catalog: VoiceCatalogResponse | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Dual voice pipeline — voices + dialects + live $/1k-characters pricing for
 * a given provider (GET /api/voice-catalog?provider=...). Refetches whenever
 * `provider` changes; pass `null` to skip fetching (e.g. before the user has
 * chosen to customize their voice).
 */
export function useVoiceCatalog(provider: VoiceProvider | null): UseVoiceCatalogReturn {
  const { token } = useAuth();
  const [catalog, setCatalog] = useState<VoiceCatalogResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    if (!token || !provider) {
      setCatalog(null);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(config.getApiUrl(config.api.voice.catalog(provider)), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch voice catalog: ${response.statusText}`);
      }
      setCatalog(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch voice catalog');
      setCatalog(null);
    } finally {
      setIsLoading(false);
    }
  }, [token, provider]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return { catalog, isLoading, error };
}
