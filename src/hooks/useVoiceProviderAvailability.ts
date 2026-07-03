import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';
import type { VoiceAvailability } from '@/types/types';

interface UseVoiceProviderAvailabilityReturn {
  availability: VoiceAvailability | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Dual voice pipeline — per-provider availability, checked once when the
 * pre-session voice panel mounts so it can disable an unavailable provider
 * (e.g. our shared ElevenLabs account is out of quota) *before* the
 * subscriber picks a voice that would fail mid-session.
 */
export function useVoiceProviderAvailability(): UseVoiceProviderAvailabilityReturn {
  const { token } = useAuth();
  const [availability, setAvailability] = useState<VoiceAvailability | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(config.getApiUrl(config.api.voice.availability), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch voice availability: ${response.statusText}`);
      }
      setAvailability(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch voice availability');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  return { availability, isLoading, error };
}
