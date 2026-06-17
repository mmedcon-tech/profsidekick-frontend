import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import config from '@/lib/config';
import type { Program, ThemeConfig } from '@/lib/v2/data';

export function usePrograms() {
  const { token, user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPrograms = useCallback(async () => {
    if (!token || !user) return;
    try {
      setLoading(true);
      const endpoint = user.role === 'subscriber' ? '/api/programs/my' : '/api/programs';
      const url = config.getApiUrl(endpoint);
      
      const data = await apiFetch<any>(url, { token });
      
      const mappedPrograms: Program[] = (data.programs || []).map((p: any) => ({
        id: p.id,
        publisherId: p.publisher_id || 'system',
        name: typeof p.name === 'string' ? { en: p.name, ar: p.name } : p.name,
        slug: p.slug,
        description: typeof p.description === 'string' ? { en: p.description, ar: p.description } : p.description || { en: '', ar: '' },
        themeConfig: p.theme_config || {
          brandName: p.name?.en || 'Brand',
          primaryColor: "#1A3C6B",
          secondaryColor: "#D4AF37",
          accentColor: "#FFFFFF",
          fontFamily: "Inter, sans-serif",
        },
        isActive: p.is_active,
        isPublic: p.is_public ?? false,
        avatarIds: p.avatar_ids || [],
        courseIds: p.course_ids || [],
        memberIds: p.member_ids || [],
      }));

      setPrograms(mappedPrograms);
    } catch (err) {
      console.error("Error fetching programs:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const createProgram = async (payload: Partial<Program>) => {
    if (!token) throw new Error("Not authenticated");
    const url = config.getApiUrl('/api/programs');
    const res = await apiFetch<any>(url, {
      method: 'POST',
      token,
      body: JSON.stringify({
        name: payload.name,
        slug: payload.slug,
        description: payload.description,
        theme_config: payload.themeConfig,
        is_public: payload.isPublic,
      }),
    });
    await fetchPrograms();
    return res;
  };

  const updateProgram = async (programId: string, payload: Partial<Program>) => {
    if (!token) throw new Error("Not authenticated");
    const url = config.getApiUrl(`/api/programs/${programId}`);
    const res = await apiFetch<any>(url, {
      method: 'PATCH',
      token,
      body: JSON.stringify({
        name: payload.name,
        slug: payload.slug,
        description: payload.description,
        theme_config: payload.themeConfig,
        is_public: payload.isPublic,
      }),
    });
    await fetchPrograms();
    return res;
  };

  return { programs, loading, error, createProgram, updateProgram, refetch: fetchPrograms };
}
