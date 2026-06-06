"use client";

import React, { useEffect, useState } from 'react';
import { adminUserApi, ApiError } from '@/lib/avatarApi';
import type { UserRecord } from '@/types/avatar';
import { Users, Search, Trash2, UserCircle } from 'lucide-react';

export default function AdminSubscribersPage() {
  const [users, setUsers]     = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [query, setQuery]     = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

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

  const filtered = users.filter((u) =>
    !query ||
    u.username.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Users size={24} className="text-green-600" />
        <h1 className="text-2xl font-bold text-gray-900">Subscribers</h1>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          placeholder="Search subscribers..." />
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Subscriber</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400">
                  <UserCircle size={32} className="mx-auto mb-2" />
                  No subscribers found.
                </td>
              </tr>
            ) : filtered.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-semibold text-green-700 flex-shrink-0">
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-gray-400">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(u)} disabled={deleting === u.id}
                    className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
