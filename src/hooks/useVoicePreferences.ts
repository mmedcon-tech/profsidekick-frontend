import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';
import type { VoicePreferenceWithResolution, VoiceProvider } from '@/types/types';

interface UseVoicePreferencesReturn {
  data: VoicePreferenceWithResolution | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  saveOverride: (
    provider: VoiceProvider,
    voiceId: string,
    dialect?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  clearOverride: () => Promise<{ success: boolean; error?: string }>;
  isSaving: boolean;
}

/**
 * Dual voice pipeline — the subscriber's saved voice override (if any) plus
 * the resolved effective voice (subscriber override > publisher default).
 */
export function useVoicePreferences(): UseVoicePreferencesReturn {
  const { token } = useAuth();
  const [data, setData] = useState<VoicePreferenceWithResolution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(config.getApiUrl(config.api.voice.preferences), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch voice preferences: ${response.statusText}`);
      }
      setData(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch voice preferences');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const saveOverride = useCallback(
    async (provider: VoiceProvider, voiceId: string, dialect?: string) => {
      if (!token) return { success: false, error: 'Not authenticated' };
      setIsSaving(true);
      try {
        const response = await fetch(config.getApiUrl(config.api.voice.preferences), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ provider, voice_id: voiceId, dialect }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          return { success: false, error: body.detail ?? `HTTP ${response.status}` };
        }
        await fetchPreferences();
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to save voice preference',
        };
      } finally {
        setIsSaving(false);
      }
    },
    [token, fetchPreferences],
  );

  const clearOverride = useCallback(async () => {
    if (!token) return { success: false, error: 'Not authenticated' };
    setIsSaving(true);
    try {
      const response = await fetch(config.getApiUrl(config.api.voice.preferences), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok && response.status !== 204) {
        return { success: false, error: `HTTP ${response.status}` };
      }
      await fetchPreferences();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to clear voice preference',
      };
    } finally {
      setIsSaving(false);
    }
  }, [token, fetchPreferences]);

  return { data, isLoading, error, refetch: fetchPreferences, saveOverride, clearOverride, isSaving };
}
