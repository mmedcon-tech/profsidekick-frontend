"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminAvatarApi, templateApi } from '@/lib/avatarApi';
import type { AvatarSummary, AvatarTemplateResponse } from '@/types/avatar';
import { Globe, ChevronRight, Search } from 'lucide-react';
import AvatarIcon from '@/components/avatars/AvatarIcon';

export default function AdminMarketplacePage() {
  const [avatars,   setAvatars]   = useState<AvatarSummary[]>([]);
  const [templates, setTemplates] = useState<Map<string, AvatarTemplateResponse>>(new Map());
  const [loading,   setLoading]   = useState(true);
  const [query,     setQuery]     = useState('');

  useEffect(() => {
    Promise.allSettled([
      adminAvatarApi.list(),
      templateApi.list(),
    ]).then(([a, t]) => {
      if (a.status === 'fulfilled') {
        setAvatars(a.value.avatars.filter((av) => av.is_published));
      }
      if (t.status === 'fulfilled') {
        setTemplates(new Map(t.value.map((tmpl) => [tmpl.id, tmpl])));
      }
    }).finally(() => setLoading(false));
  }, []);

  const filtered = avatars.filter(
    (a) =>
      !query ||
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      (a.description ?? '').toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Marketplace Management</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Published publisher avatar instances. Click any avatar to manage it.
        </p>
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

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-3 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Globe size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {query ? 'No avatars match your search.' : 'No published avatars yet.'}
            </p>
          </div>
        ) : (
          filtered.map((a) => {
            const tmpl = templates.get(a.template_id);
            return (
              <Link
                key={a.id}
                href={`/admin/marketplace/${a.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
              >
                <AvatarIcon
                  imageUrl={a.template_image_url}
                  name={a.name}
                  size={40}
                  rounded="lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-[#133221] transition-colors">
                      {a.name}
                    </p>
                    <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                      <Globe size={10} /> Live
                    </span>
                  </div>
                  {a.description && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{a.description}</p>
                  )}
                  {tmpl && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Based on template:{' '}
                      <span className="text-[#BA984E] font-medium">{tmpl.name}</span>
                    </p>
                  )}
                </div>
                <ChevronRight
                  size={16}
                  className="text-gray-300 group-hover:text-[#133221] flex-shrink-0 transition-colors"
                />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
