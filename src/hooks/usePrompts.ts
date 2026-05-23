import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface CustomPrompt {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  tags: string; // Comma-separated string instead of array
  isDefault: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  userId?: string;
}

export interface PromptsResponse {
  prompts: CustomPrompt[];
  defaultPrompts: CustomPrompt[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UsePromptsOptions {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  includePublic?: boolean;
  autoFetch?: boolean;
}

export function usePrompts(options: UsePromptsOptions = {}) {
  const { 
    page = 1, 
    limit = 50, 
    category, 
    search, 
    includePublic = true, 
    autoFetch = true 
  } = options;
  const { token } = useAuth();
  
  const [data, setData] = useState<PromptsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!token) {
        throw new Error('Not authenticated');
      }

      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        include_public: includePublic.toString(),
      });

      if (category) {
        searchParams.append('category', category);
      }

      if (search) {
        searchParams.append('search', search);
      }

      const response = await fetch(`/api/prompts?${searchParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch prompts');
      }

      const promptsData = await response.json();
      setData(promptsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching prompts:', err);
    } finally {
      setLoading(false);
    }
  };

  const createPrompt = async (promptData: Omit<CustomPrompt, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'userId'>) => {
    try {
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(promptData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create prompt');
      }

      const newPrompt = await response.json();
      
      // Update local state with the new prompt
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          prompts: [newPrompt, ...prev.prompts],
          pagination: {
            ...prev.pagination,
            total: prev.pagination.total + 1,
          }
        };
      });

      return newPrompt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create prompt';
      throw new Error(errorMessage);
    }
  };

  const updatePrompt = async (promptId: string, promptData: Partial<CustomPrompt>) => {
    try {
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/prompts/${promptId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(promptData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update prompt');
      }

      const updatedPrompt = await response.json();
      
      // Update local state with the updated prompt
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          prompts: prev.prompts.map(p => 
            p.id === promptId ? updatedPrompt : p
          ),
        };
      });

      return updatedPrompt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update prompt';
      throw new Error(errorMessage);
    }
  };

  const deletePrompt = async (promptId: string) => {
    try {
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/prompts/${promptId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete prompt');
      }

      // Update local state by removing the deleted prompt
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          prompts: prev.prompts.filter(p => p.id !== promptId),
          pagination: {
            ...prev.pagination,
            total: prev.pagination.total - 1,
          }
        };
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete prompt';
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    if (autoFetch && token) {
      fetchPrompts();
    }
  }, [page, limit, category, search, includePublic, autoFetch, token]);

  return {
    prompts: data?.prompts || [],
    defaultPrompts: data?.defaultPrompts || [],
    pagination: data?.pagination,
    loading,
    error,
    refetch: fetchPrompts,
    createPrompt,
    updatePrompt,
    deletePrompt,
  };
} 