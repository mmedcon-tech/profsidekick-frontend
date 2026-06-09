"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch, ApiError } from '@/lib/api';
import { config } from '@/lib/config';
import {
  ArrowLeft, CreditCard, Key, TrendingDown,
  ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Loader2,
} from 'lucide-react';

interface BalanceInfo {
  source: string;
  balance: string;
  access_code: string | null;
  issued_by: string | null;
}

interface UsageRecord {
  id: string;
  operation_type: string;
  input_tokens: number;
  output_tokens: number;
  credits_charged: string;
  funded_by: string;
  created_at: string;
}

interface UsageResponse {
  records: UsageRecord[];
  total: number;
  pagination: { page: number; totalPages: number };
}

function formatOp(op: string) {
  return op.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminUserBalancePage() {
  const { id: userId } = useParams<{ id: string }>();
  const { token } = useAuth();

  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [page, setPage] = useState(1);
  const [usageLoading, setUsageLoading] = useState(true);

  // Adjust form
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!token || !userId) return;
    setBalanceLoading(true); setBalanceError(null);
    try {
      const data = await apiFetch<BalanceInfo>(
        config.getApiUrl(config.api.adminBilling.userBalance(userId)),
        { token },
      );
      setBalance(data);
    } catch (e) {
      setBalanceError(e instanceof ApiError ? e.message : 'Failed to load balance');
    } finally {
      setBalanceLoading(false);
    }
  }, [token, userId]);

  const fetchUsage = useCallback(async () => {
    if (!token || !userId) return;
    setUsageLoading(true);
    try {
      const data = await apiFetch<UsageResponse>(
        config.getApiUrl(`${config.api.adminBilling.usage}?user_id=${userId}&page=${page}&limit=15`),
        { token },
      );
      setUsage(data);
    } catch {
      // non-critical
    } finally {
      setUsageLoading(false);
    }
  }, [token, userId, page]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);
  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const deltaNum = parseFloat(delta);
    if (isNaN(deltaNum) || deltaNum === 0) { setAdjustError('Enter a non-zero amount.'); return; }
    setAdjusting(true); setAdjustError(null); setAdjustSuccess(null);
    try {
      const result = await apiFetch<{ previous_balance: string; new_balance: string; delta_credits: string }>(
        config.getApiUrl(config.api.adminBilling.userAdjust(userId)),
        { method: 'POST', token, body: JSON.stringify({ delta_credits: deltaNum, reason }) },
      );
      const action = deltaNum > 0 ? 'Granted' : 'Deducted';
      setAdjustSuccess(
        `${action} ${Math.abs(deltaNum)} credits. New balance: ${parseFloat(result.new_balance).toFixed(2)}`
      );
      setDelta(''); setReason('');
      fetchBalance();
      fetchUsage();
    } catch (e) {
      setAdjustError(e instanceof ApiError ? e.message : 'Adjustment failed');
    } finally {
      setAdjusting(false);
    }
  };

  const balanceNum = balance ? parseFloat(balance.balance) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/billing" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <ArrowLeft size={16} /> Credits
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate max-w-xs">{userId}</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Balance</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Balance card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-blue-600" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Current Balance</h2>
          </div>

          {balanceLoading ? (
            <div className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
          ) : balanceError ? (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle size={14} /> {balanceError}
            </div>
          ) : balance && (
            <>
              <p className="text-3xl font-bold text-blue-700">
                {balanceNum.toFixed(2)}
                <span className="text-base font-normal text-gray-500 ml-2">credits</span>
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Source:</span>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                    balance.source === 'access_code' ? 'bg-indigo-100 text-indigo-700' :
                    balance.source === 'purchased' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {balance.source === 'access_code' && <Key size={10} />}
                    {balance.source.replace('_', ' ')}
                  </span>
                </div>
                {balance.access_code && (
                  <p className="text-gray-600 dark:text-gray-400 font-mono text-xs">{balance.access_code}</p>
                )}
                {balance.issued_by && (
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Issued by {balance.issued_by}</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Adjust balance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Adjust Balance</h2>
          <form onSubmit={handleAdjust} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Credits — positive to grant, negative to deduct
              </label>
              <input
                type="number" step="0.01"
                value={delta} onChange={(e) => setDelta(e.target.value)}
                placeholder="e.g. 100  or  -50"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <input
                value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Scholarship allocation"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {adjustError && (
              <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                <AlertCircle size={13} /> {adjustError}
              </div>
            )}
            {adjustSuccess && (
              <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs">
                <CheckCircle size={13} /> {adjustSuccess}
              </div>
            )}

            <button type="submit" disabled={adjusting || !delta || !reason.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {adjusting ? <Loader2 size={14} className="animate-spin" /> : null}
              {adjusting ? 'Applying…' : 'Apply Adjustment'}
            </button>
          </form>
        </div>
      </div>

      {/* Usage history */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <TrendingDown size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Usage History</h2>
          {usage && <span className="text-xs text-gray-400 ml-auto">{usage.total} records</span>}
        </div>

        {usageLoading ? (
          <div className="p-5 space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />)}
          </div>
        ) : !usage || usage.records.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">No usage records for this user.</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Operation</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Tokens in</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Tokens out</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Credits</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Funded by</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {usage.records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{formatOp(r.operation_type)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{r.input_tokens.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{r.output_tokens.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-700">
                      {parseFloat(r.credits_charged).toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{r.funded_by.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      {new Date(r.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {usage.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400">Page {usage.pagination.page} of {usage.pagination.totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:bg-gray-900">
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={page >= usage.pagination.totalPages}
                    className="p-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:bg-gray-900">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
