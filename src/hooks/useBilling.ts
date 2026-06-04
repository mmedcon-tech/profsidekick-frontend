import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';

export interface BalanceInfo {
  source: 'access_code' | 'purchased' | 'none';
  balance: string;
  access_code: string | null;
  issued_by: string | null;
}

interface UseBillingReturn {
  balance: BalanceInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBilling(): UseBillingReturn {
  const { token } = useAuth();
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(config.getApiUrl(config.api.billing.balance), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.statusText}`);
      }

      const data: BalanceInfo = await response.json();
      setBalance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, isLoading, error, refetch: fetchBalance };
}
