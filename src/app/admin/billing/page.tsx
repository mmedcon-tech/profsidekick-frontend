"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch, ApiError } from '@/lib/api';
import { config } from '@/lib/config';
import {
  CreditCard, Plus, CheckCircle, XCircle, Key,
  ChevronRight, AlertCircle, Loader2, Users,
} from 'lucide-react';

interface AccessCode {
  id: string;
  code: string;
  total_credits: string;
  remaining_credits: string;
  issued_by: string;
  max_redemptions: number;
  redemptions_used: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
      <CheckCircle size={10} /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
      <XCircle size={10} /> Inactive
    </span>
  );
}

export default function AdminBillingPage() {
  const { token } = useAuth();
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    issued_by: '',
    total_credits: '',
    max_redemptions: '1',
    expires_at: '',
    code: '',
  });

  // Deactivate
  const [deactivating, setDeactivating] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<{ codes: AccessCode[]; total: number }>(
        config.getApiUrl(config.api.adminBilling.accessCodes),
        { token },
      );
      setCodes(data.codes);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load access codes');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);
    try {
      const body: Record<string, unknown> = {
        issued_by: form.issued_by,
        total_credits: parseFloat(form.total_credits),
        max_redemptions: parseInt(form.max_redemptions, 10),
      };
      if (form.expires_at) body.expires_at = new Date(form.expires_at).toISOString();
      if (form.code.trim()) body.code = form.code.trim().toUpperCase();

      const created = await apiFetch<AccessCode>(
        config.getApiUrl(config.api.adminBilling.accessCodes),
        { method: 'POST', token, body: JSON.stringify(body) },
      );
      setCodes((prev) => [created, ...prev]);
      setCreateSuccess(`Code created: ${created.code}`);
      setForm({ issued_by: '', total_credits: '', max_redemptions: '1', expires_at: '', code: '' });
      setShowForm(false);
    } catch (e) {
      setCreateError(e instanceof ApiError ? e.message : 'Failed to create code');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (id: string, code: string) => {
    if (!token || !confirm(`Deactivate code "${code}"?`)) return;
    setDeactivating(id);
    try {
      const updated = await apiFetch<AccessCode>(
        config.getApiUrl(config.api.adminBilling.accessCodeDeactivate(id)),
        { method: 'PATCH', token },
      );
      setCodes((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Failed to deactivate');
    } finally {
      setDeactivating(null);
    }
  };

  const activeCodes = codes.filter((c) => c.is_active).length;
  const totalIssued = codes.reduce((s, c) => s + parseFloat(c.total_credits), 0);
  const totalRemaining = codes.filter((c) => c.is_active).reduce((s, c) => s + parseFloat(c.remaining_credits), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard size={24} className="text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Credits</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage access codes and user balances</p>
          </div>
        </div>
        <Link
          href="/admin/subscribers"
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors"
        >
          <Users size={16} /> User Balances <ChevronRight size={14} />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Codes', value: loading ? '—' : activeCodes, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Credits Issued', value: loading ? '—' : totalIssued.toFixed(0), color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Credits Remaining', value: loading ? '—' : totalRemaining.toFixed(2), color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <Key size={18} className={s.color} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Success / error banners */}
      {createSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle size={16} /> {createSuccess}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Access codes section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Access Codes</h2>
          <button
            onClick={() => { setShowForm(!showForm); setCreateError(null); }}
            className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> Create Code
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Issued By <span className="text-red-500">*</span></label>
                <input
                  value={form.issued_by} onChange={(e) => setForm((f) => ({ ...f, issued_by: e.target.value }))}
                  placeholder="e.g. Prof. Smith / NYU"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Credits <span className="text-red-500">*</span></label>
                <input
                  type="number" min="1" step="0.01"
                  value={form.total_credits} onChange={(e) => setForm((f) => ({ ...f, total_credits: e.target.value }))}
                  placeholder="e.g. 500"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Max Redemptions</label>
                <input
                  type="number" min="1"
                  value={form.max_redemptions} onChange={(e) => setForm((f) => ({ ...f, max_redemptions: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Expires At</label>
                <input
                  type="date"
                  value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Custom Code (optional — auto-generated if blank)</label>
                <input
                  value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="XXXX-XXXX-XXXX"
                  maxLength={50}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {createError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle size={14} /> {createError}
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={creating}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {creating ? 'Creating…' : 'Create Code'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Codes table */}
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />)}
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Key size={32} className="mx-auto mb-2" />
            <p className="text-sm">No access codes yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Code</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Issued By</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Credits</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Remaining</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Redemptions</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Expires</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {codes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">{c.code}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.issued_by}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{parseFloat(c.total_credits).toFixed(0)}</td>
                    <td className="px-4 py-3 text-right font-medium text-blue-700">
                      {parseFloat(c.remaining_credits).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      {c.redemptions_used}/{c.max_redemptions}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge active={c.is_active} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.is_active && (
                        <button
                          onClick={() => handleDeactivate(c.id, c.code)}
                          disabled={deactivating === c.id}
                          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
                        >
                          {deactivating === c.id ? 'Deactivating…' : 'Deactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User balance lookup shortcut */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">Adjust a User's Balance</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-0.5">
              Go to the Subscribers list, click a user, then navigate to their Credits page — or paste a user ID below.
            </p>
          </div>
        </div>
        <UserLookupForm token={token} />
      </div>
    </div>
  );
}

function UserLookupForm({ token }: { token: string | null }) {
  const [userId, setUserId] = useState('');
  const [balance, setBalance] = useState<{ source: string; balance: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const lookup = async () => {
    if (!token || !userId.trim()) return;
    setLoading(true); setErr(null); setBalance(null);
    try {
      const data = await apiFetch<{ source: string; balance: string }>(
        config.getApiUrl(config.api.adminBilling.userBalance(userId.trim())),
        { token },
      );
      setBalance(data);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'User not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          value={userId} onChange={(e) => setUserId(e.target.value)}
          placeholder="Paste user UUID…"
          className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <button onClick={lookup} disabled={loading || !userId.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Look up'}
        </button>
        {userId.trim() && (
          <Link href={`/admin/billing/users/${userId.trim()}`}
            className="px-4 py-2 border border-blue-300 text-blue-700 text-sm rounded-lg hover:bg-blue-100 transition-colors">
            Open
          </Link>
        )}
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {balance && (
        <div className="text-sm text-blue-800">
          Balance: <span className="font-semibold">{parseFloat(balance.balance).toFixed(2)} credits</span>
          <span className="text-blue-500 ml-2">({balance.source})</span>
        </div>
      )}
    </div>
  );
}
