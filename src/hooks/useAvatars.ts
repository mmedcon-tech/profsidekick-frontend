import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Avatar } from '@/types/types';

interface AvatarsResponse {
  avatars: Avatar[];
}

export function useAvatars() {
  const { token } = useAuth();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvatars = useCallback(async () => {
    if (!token) {
      setError('Not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/avatars', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = (await response.json()) as AvatarsResponse & { detail?: string };
      if (!response.ok) {
        throw new Error(data.detail ?? 'Failed to load avatars');
      }
      setAvatars(data.avatars ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load avatars');
      setAvatars([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAvatars();
  }, [fetchAvatars]);

  return { avatars, loading, error, refetch: fetchAvatars };
}
