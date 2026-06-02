"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useBilling } from '@/hooks/useBilling';
import { apiFetch, ApiError } from '@/lib/api';
import { config } from '@/lib/config';
import { CreditCard, CheckCircle, AlertCircle, Info } from 'lucide-react';

const PRESETS = ['5', '10', '25', '50'];

export default function AddCreditsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { balance, refetch } = useBilling();
  const [amount, setAmount] = useState('10');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const creditsPreview = parseFloat(amount || '0') * 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !amount) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await apiFetch<{ success: boolean; credits_added: string; new_balance: string; message: string }>(
        config.getApiUrl(config.api.billing.addCredits),
        {
          method: 'POST',
          token,
          body: JSON.stringify({ amount_usd: amount }),
        },
      );

      setSuccess(data.message);
      refetch();
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        router.push('/billing/redeem');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to add credits');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-12 px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="text-blue-600" size={24} />
          <h1 className="text-2xl font-bold text-gray-900">Add Credits</h1>
        </div>

        <div className="mb-6 p-4 bg-amber-50 rounded-lg flex gap-2 text-sm text-amber-800">
          <Info size={16} className="shrink-0 mt-0.5" />
          <p>
            This is a direct credit top-up. 1 credit = $0.01 USD (100 credits per dollar).
            Payment processing is not yet enabled — contact your institution for access codes.
          </p>
        </div>

        {balance && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
            Current balance:{' '}
            <span className="font-semibold">{parseFloat(balance.balance).toFixed(2)} credits</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (USD)
            </label>
            <div className="flex gap-2 mb-3">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    amount === p
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  ${p}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
              required
            />
            {amount && parseFloat(amount) > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                = {creditsPreview.toFixed(2)} credits
              </p>
            )}
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
            disabled={isLoading || !amount || parseFloat(amount) <= 0}
            className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Processing…' : `Add ${creditsPreview.toFixed(0)} credits`}
          </button>
        </form>

        <div className="mt-4 text-center space-x-4">
          <button
            onClick={() => router.push('/billing/redeem')}
            className="text-sm text-blue-600 hover:underline"
          >
            Redeem access code instead
          </button>
          <button
            onClick={() => router.push('/billing/usage')}
            className="text-sm text-gray-500 hover:underline"
          >
            View usage
          </button>
        </div>
      </div>
    </div>
  );
}
