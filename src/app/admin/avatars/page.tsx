"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { templateApi, ApiError } from '@/lib/avatarApi';
import type { AvatarTemplateResponse } from '@/types/avatar';
import AvatarIcon from '@/components/avatars/AvatarIcon';
import { Search, ChevronRight, Layers } from 'lucide-react';

function StatusBadge({ state }: { state: string }) {
  const map: Record<string, string> = {
    published: 'bg-primary/10 text-primary/90',
    draft:     'bg-amber-100 text-amber-700',
    archived:  'bg-gray-100 dark:bg-gray-800 text-gray-400',
    unpublished: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${map[state] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
      {state}
    </span>
  );
}

export default function AdminAvatarsPage() {
  const [templates, setTemplates] = useState<AvatarTemplateResponse[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [query, setQuery]         = useState('');

  useEffect(() => {
    templateApi.list()
      .then(setTemplates)
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = templates.filter((t) =>
    !query || t.name.toLowerCase().includes(query.toLowerCase()) ||
    (t.category ?? '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Active Avatars</h1>
        <Link href="/admin/templates/new"
          className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
          + New Template
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#133221] text-sm"
          placeholder="Search avatars…"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-40 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Layers size={36} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No avatars found.</p>
            <Link href="/admin/templates/new" className="text-sm text-indigo-600 hover:underline mt-1 inline-block">
              Create the first template
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((t) => (
              <Link
                key={t.id}
                href={`/admin/avatars/${t.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:bg-gray-900 transition-colors group"
              >
                <AvatarIcon imageUrl={t.avatar_image_url} name={t.name} size={40} rounded="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t.name}</span>
                    <StatusBadge state={t.published_state} />
                    {t.category && (
                      <span className="text-xs text-indigo-600 bg-gray-50 px-2 py-0.5 rounded-full">
                        {t.category}
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{t.description}</p>
                  )}
                  <p className="text-[10px] text-gray-300 mt-0.5">
                    {t.version_count} version{t.version_count !== 1 ? 's' : ''} ·{' '}
                    {t.roles.length} role{t.roles.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 dark:text-gray-400 flex-shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
