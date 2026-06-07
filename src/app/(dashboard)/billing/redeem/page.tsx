"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useBilling } from '@/hooks/useBilling';
import { apiFetch, ApiError } from '@/lib/api';
import { config } from '@/lib/config';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

export default function RedeemPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { balance, refetch } = useBilling();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !code.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await apiFetch<{
        success: boolean;
        credits_available: string;
        code: string;
        message: string;
      }>(config.getApiUrl(config.api.billing.redeem), {
        method: 'POST',
        token,
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });

      setSuccess(data.message);
      setCode('');
      refetch();
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        router.push('/billing/redeem');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to redeem code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-12 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="text-blue-600" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Redeem Access Code</h1>
        </div>

        {balance && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              Current balance:{' '}
              <span className="font-semibold">
                {parseFloat(balance.balance).toFixed(2)} credits
              </span>
              {balance.source === 'access_code' && balance.issued_by && (
                <span className="text-blue-500"> (via {balance.issued_by})</span>
              )}
            </p>
          </div>
        )}

        <form onSubmit={handleRedeem} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Access Code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase tracking-widest"
              disabled={isLoading}
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-700 text-sm">
              <CheckCircle size={16} />
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !code.trim()}
            className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Redeeming…' : 'Redeem Code'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/billing/usage')}
            className="text-sm text-blue-600 hover:underline"
          >
            View usage history
          </button>
        </div>
      </div>
    </div>
  );
}
