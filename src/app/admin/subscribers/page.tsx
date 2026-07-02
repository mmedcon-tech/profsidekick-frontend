"use client";

import React, { useEffect, useState } from 'react';
import { adminUserApi, ApiError } from '@/lib/avatarApi';
import type { UserRecord } from '@/types/avatar';
import { Users, Search, Trash2, UserCircle, ArrowUpCircle } from 'lucide-react';

export default function AdminSubscribersPage() {
  const [users, setUsers]         = useState<UserRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [query, setQuery]         = useState('');
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [promoting, setPromoting] = useState<string | null>(null);

  useEffect(() => {
    adminUserApi.list('subscriber')
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (u: UserRecord) => {
    if (!confirm(`Delete subscriber "${u.username}"?`)) return;
    setDeleting(u.id);
    try {
      await adminUserApi.delete(u.id);
      setUsers((p) => p.filter((x) => x.id !== u.id));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const handlePromote = async (u: UserRecord) => {
    if (!confirm(`Promote "${u.username}" to publisher?`)) return;
    setPromoting(u.id);
    try {
      await adminUserApi.setRole(u.id, 'publisher');
      setUsers((p) => p.filter((x) => x.id !== u.id));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Promote failed');
    } finally {
      setPromoting(null);
    }
  };

  const filtered = users.filter((u) =>
    !query ||
    u.username.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Users size={24} className="text-green-600" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Subscribers</h1>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#133221] text-sm"
          placeholder="Search subscribers..." />
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Subscriber</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400">
                  <UserCircle size={32} className="mx-auto mb-2" />
                  No subscribers found.
                </td>
              </tr>
            ) : filtered.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:bg-gray-900">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-semibold text-green-700 flex-shrink-0">
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-gray-400">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.email}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handlePromote(u)}
                      disabled={promoting === u.id || deleting === u.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                                 bg-blue-50 text-blue-700 border border-blue-200
                                 hover:bg-blue-100 disabled:opacity-40 transition-colors"
                    >
                      <ArrowUpCircle size={14} />
                      Promote
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      disabled={deleting === u.id || promoting === u.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                                 bg-red-50 text-red-600 border border-red-200
                                 hover:bg-red-100 disabled:opacity-40 transition-colors"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
