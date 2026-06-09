import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';
import { apiFetch } from '@/lib/api';

export interface CourseAccessCode {
  id: string;
  course_id: string;
  code: string;
  created_by: string;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export function useCourseAccessCodes() {
  const { token } = useAuth();

  const getCodes = useCallback(async (courseId: string): Promise<CourseAccessCode[]> => {
    if (!token) throw new Error('Authentication required');
    const data = await apiFetch<{ codes: CourseAccessCode[] }>(
      config.getApiUrl(`/api/courses/${courseId}/access-codes`),
      { token }
    );
    return data.codes ?? [];
  }, [token]);

  const generateCode = useCallback(async (
    courseId: string,
    options: { max_uses?: number | null; expires_at?: string | null } = {}
  ): Promise<{ code: string; id: string; course_id: string }> => {
    if (!token) throw new Error('Authentication required');
    return apiFetch(config.getApiUrl(`/api/courses/${courseId}/access-codes`), {
      method: 'POST',
      token,
      body: JSON.stringify(options),
    });
  }, [token]);

  const revokeCode = useCallback(async (codeId: string): Promise<void> => {
    if (!token) throw new Error('Authentication required');
    await apiFetch(config.getApiUrl(`/api/courses/access-codes/${codeId}`), {
      method: 'DELETE',
      token,
    });
  }, [token]);

  const joinCourse = useCallback(async (
    code: string
  ): Promise<{ message: string; course_id: string; course_name: string }> => {
    if (!token) throw new Error('Authentication required');
    return apiFetch(config.getApiUrl('/api/courses/join'), {
      method: 'POST',
      token,
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    });
  }, [token]);

  return { getCodes, generateCode, revokeCode, joinCourse };
}
