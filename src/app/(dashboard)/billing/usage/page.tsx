"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useBilling } from '@/hooks/useBilling';
import { apiFetch, ApiError } from '@/lib/api';
import { config } from '@/lib/config';
import { CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';

interface UsageRecord {
  id: string;
  operation_type: string;
  input_tokens: number;
  output_tokens: number;
  raw_cost_usd: string;
  platform_fee_usd: string;
  total_cost_usd: string;
  credits_charged: string;
  funded_by: string;
  created_at: string;
}

interface UsageResponse {
  records: UsageRecord[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function UsagePage() {
  const router = useRouter();
  const { token } = useAuth();
  const { balance } = useBilling();
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  const fetchUsage = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<UsageResponse>(
        config.getApiUrl(`${config.api.billing.usage}?page=${page}&limit=${limit}`),
        { token },
      );
      setUsage(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        router.push('/billing/redeem');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load usage');
    } finally {
      setIsLoading(false);
    }
  }, [token, page, router]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="max-w-4xl mx-auto mt-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CreditCard className="text-blue-600" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Usage History</h1>
        </div>
        {balance && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Balance:{' '}
            <span className="font-semibold text-blue-700">
              {parseFloat(balance.balance).toFixed(2)} credits
            </span>
          </p>
        )}
      </div>

      <div className="mb-4 flex gap-3">
        <button
          onClick={() => router.push('/billing/redeem')}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Redeem Code
        </button>
        <button
          onClick={() => router.push('/billing/add-credits')}
          className="px-4 py-2 text-sm border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors"
        >
          Add Credits
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 rounded-lg text-red-700 text-sm mb-4">{error}</div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading…</div>
      ) : usage && usage.records.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">No usage records yet.</div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Operation</th>
                  <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Tokens in</th>
                  <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Tokens out</th>
                  <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Credits</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Funded by</th>
                  <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {usage?.records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:bg-gray-900">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {r.operation_type.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                      {r.input_tokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                      {r.output_tokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-blue-700">
                      {parseFloat(r.credits_charged).toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">
                      {r.funded_by.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                      {formatDate(r.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {usage && usage.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {usage.pagination.page} of {usage.pagination.totalPages} ({usage.total} records)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:bg-gray-900"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= usage.pagination.totalPages}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:bg-gray-900"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
