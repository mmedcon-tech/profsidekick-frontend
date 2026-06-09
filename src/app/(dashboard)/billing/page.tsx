"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useBilling } from '@/hooks/useBilling';
import { apiFetch } from '@/lib/api';
import { config } from '@/lib/config';
import {
  Wallet, CreditCard, ArrowRight, RefreshCw,
  TrendingDown, Key, PlusCircle, AlertTriangle,
} from 'lucide-react';

interface UsageRecord {
  id: string;
  operation_type: string;
  credits_charged: string;
  funded_by: string;
  created_at: string;
}

interface UsageResponse {
  records: UsageRecord[];
  total: number;
}

function SourceBadge({ source, issuedBy, code }: { source: string; issuedBy: string | null; code: string | null }) {
  if (source === 'access_code') {
    return (
      <div className="flex items-center gap-2 mt-1">
        <span className="inline-flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
          <Key size={10} /> Access Code
        </span>
        {code && <span className="text-xs font-mono text-gray-500">{code}</span>}
        {issuedBy && <span className="text-xs text-gray-400">by {issuedBy}</span>}
      </div>
    );
  }
  if (source === 'purchased') {
    return (
      <div className="flex items-center gap-2 mt-1">
        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
          <CreditCard size={10} /> Purchased
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
        No balance
      </span>
    </div>
  );
}

function formatOp(op: string) {
  return op.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function WalletPage() {
  const { token } = useAuth();
  const { balance, isLoading: balanceLoading, refetch } = useBilling();
  const [recent, setRecent] = useState<UsageRecord[]>([]);
  const [usageLoading, setUsageLoading] = useState(true);

  const fetchRecent = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<UsageResponse>(
        config.getApiUrl(`${config.api.billing.usage}?page=1&limit=5`),
        { token },
      );
      setRecent(data.records);
    } catch {
      // silent — usage history is non-critical on the wallet overview
    } finally {
      setUsageLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchRecent(); }, [fetchRecent]);

  const balanceNum = balance ? parseFloat(balance.balance) : 0;
  const hasBalance = balance && balance.source !== 'none';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet size={24} className="text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Wallet</h1>
        </div>
        <button
          onClick={() => { refetch(); fetchRecent(); }}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Balance card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-blue-200 text-sm font-medium mb-1">Available Balance</p>
        {balanceLoading ? (
          <div className="h-10 w-32 bg-white/20 rounded-lg animate-pulse" />
        ) : (
          <p className="text-4xl font-bold tracking-tight">
            {balanceNum.toFixed(2)}
            <span className="text-xl font-normal text-blue-200 ml-2">credits</span>
          </p>
        )}
        {balance && (
          <SourceBadge
            source={balance.source}
            issuedBy={balance.issued_by ?? null}
            code={balance.access_code ?? null}
          />
        )}
      </div>

      {/* Low balance warning */}
      {!balanceLoading && !hasBalance && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-medium">No credits available</p>
            <p className="text-amber-700 mt-0.5">Redeem an access code or add credits to use AI features.</p>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/billing/redeem"
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
            <Key size={18} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Redeem Code</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Enter an access code</p>
          </div>
        </Link>
        <Link
          href="/billing/add-credits"
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 group-hover:bg-green-100 transition-colors">
            <PlusCircle size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Add Credits</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Purchase with USD</p>
          </div>
        </Link>
      </div>

      {/* Recent usage */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <TrendingDown size={16} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Recent Usage</h2>
          </div>
          <Link href="/billing/usage" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {usageLoading ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                <div className="flex-1" />
                <div className="h-3 w-16 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            No usage yet. Start a session to see activity here.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {formatOp(r.operation_type)}
                  </p>
                  <p className="text-xs text-gray-400">{timeAgo(r.created_at)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-blue-700">
                    -{parseFloat(r.credits_charged).toFixed(4)}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">{r.funded_by.replace('_', ' ')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
