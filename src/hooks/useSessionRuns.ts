import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';

export interface SessionRunSummary {
  sessionRunId: string;
  sessionId: string;
  status: "ACTIVE" | "COMPLETED" | "FAILED";
  startedAt: string;
  endedAt?: string;
  duration?: number; // in minutes
  slidesCompleted?: number;
  totalSlides?: number;
  avatarId?: string;
  avatarName?: string;
  roleAtStart?: string;
  sessionMode?: string;
  className?: string;
}

export interface SessionRunsResponse {
  runs: SessionRunSummary[];
  total: number;
}

export interface UseSessionRunsOptions {
  sessionId: string;
  autoFetch?: boolean;
}

export function useSessionRuns(options: UseSessionRunsOptions) {
  const { sessionId, autoFetch = true } = options;
  const { token } = useAuth();
  
  const [data, setData] = useState<SessionRunsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessionRuns = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(config.getApiUrl(`/api/sessions/${sessionId}/runs`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Handle case where endpoint doesn't exist (404) or other errors
        let errorMessage = 'Failed to fetch session runs';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          // If JSON parsing fails, use status-based error messages
          console.log('Error fetching session runs:', jsonError);
          if (response.status === 404) {
            errorMessage = 'Session runs endpoint not available';
          } else if (response.status === 401) {
            errorMessage = 'Authentication required';
          } else if (response.status === 403) {
            errorMessage = 'Access denied';
          } else {
            errorMessage = `Server error (${response.status})`;
          }
        }
        
        throw new Error(errorMessage);
      }

      const sessionRunsData = await response.json();
      setData(sessionRunsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching session runs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch && sessionId) {
      fetchSessionRuns();
    }
  }, [sessionId, autoFetch]);

  return {
    runs: data?.runs || [],
    total: data?.total || 0,
    loading,
    error,
    refetch: fetchSessionRuns,
  };
} 