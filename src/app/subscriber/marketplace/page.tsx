"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { marketplaceApi, ApiError } from '@/lib/avatarApi';
import type { AvatarPublicResponse } from '@/types/avatar';
import { Bot, Search, Coins } from 'lucide-react';
import AvatarIcon from '@/components/avatars/AvatarIcon';

function CostBadge({ cost }: { cost: number | null }) {
  if (!cost || cost <= 0) {
    return (
      <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
        Free
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">
      <Coins size={11} />
      {cost} credits
    </span>
  );
}

export default function MarketplacePage() {
  const [avatars, setAvatars] = useState<AvatarPublicResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [query, setQuery]     = useState('');

  useEffect(() => {
    marketplaceApi.list()
      .then((r) => setAvatars(r.avatars))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load avatars'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = avatars.filter((a) =>
    !query || a.name.toLowerCase().includes(query.toLowerCase()) ||
    (a.description || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Marketplace</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Discover AI-powered educational avatars. Subscribe to access their sessions.
        </p>
      </div>

      {/* Published Avatars */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">All Published Avatars</h2>
          <div className="relative max-w-xs w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Search avatars…" />
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="text-center py-10 bg-red-50 rounded-xl border border-red-200">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <Bot size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {query ? 'No avatars match your search.' : 'No publisher-created avatars yet.'}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((a) => (
              <Link key={a.id} href={`/subscriber/marketplace/${a.id}`}
                className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 hover:shadow-md transition-all flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <AvatarIcon imageUrl={a.template_image_url} name={a.name} size={48} rounded="lg" />
                  <CostBadge cost={a.subscription_cost} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">
                    {a.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {a.description || 'AI-powered educational avatar.'}
                  </p>
                </div>
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-auto">
                  <span className="text-sm text-blue-600 font-medium group-hover:underline">
                    View &amp; Subscribe →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
