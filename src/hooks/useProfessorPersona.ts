import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type {
  PersonaPreferenceSelections,
  ProfessorPersona,
} from '@/types/types';

interface UpsertPayload {
  avatarId: string;
  preferences: PersonaPreferenceSelections;
  refinedPrompt?: string;
}

interface RefinePayload {
  avatarId: string;
  preferences: PersonaPreferenceSelections;
  additionalInstructions?: string;
}

export function useProfessorPersona() {
  const { token } = useAuth();
  const [persona, setPersona] = useState<ProfessorPersona | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refining, setRefining] = useState(false);

  const authHeaders = useCallback((): HeadersInit => {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, [token]);

  const getPersona = useCallback(async () => {
    if (!token) {
      setError('Not authenticated');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/professor/persona', {
        headers: authHeaders(),
      });
      if (response.status === 404) {
        setPersona(null);
        return null;
      }
      const data = (await response.json()) as ProfessorPersona & { detail?: string };
      if (!response.ok) {
        throw new Error(data.detail ?? 'Failed to load persona');
      }
      setPersona(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load persona');
      return null;
    } finally {
      setLoading(false);
    }
  }, [authHeaders, token]);

  const upsertPersona = useCallback(
    async (payload: UpsertPayload): Promise<ProfessorPersona | null> => {
      if (!token) {
        setError('Not authenticated');
        return null;
      }

      try {
        setSaving(true);
        setError(null);
        const response = await fetch('/api/professor/persona', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        const data = (await response.json()) as ProfessorPersona & { detail?: string };
        if (!response.ok) {
          throw new Error(data.detail ?? 'Failed to save persona');
        }
        setPersona(data);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save persona');
        return null;
      } finally {
        setSaving(false);
      }
    },
    [authHeaders, token],
  );

  const refinePersona = useCallback(
    async (payload: RefinePayload): Promise<{ refinedPrompt: string } | null> => {
      if (!token) {
        setError('Not authenticated');
        return null;
      }

      try {
        setRefining(true);
        setError(null);
        const response = await fetch('/api/professor/persona/refine', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        const data = (await response.json()) as { refinedPrompt?: string; detail?: string };
        if (!response.ok) {
          throw new Error(data.detail ?? 'Failed to refine persona');
        }
        if (!data.refinedPrompt) {
          throw new Error('Refine returned no prompt');
        }
        return { refinedPrompt: data.refinedPrompt };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to refine persona');
        return null;
      } finally {
        setRefining(false);
      }
    },
    [authHeaders, token],
  );

  useEffect(() => {
    getPersona();
  }, [getPersona]);

  return {
    persona,
    loading,
    error,
    saving,
    refining,
    getPersona,
    upsertPersona,
    refinePersona,
    setPersona,
  };
}
