"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { marketplaceApi, subscriptionApi, ApiError } from '@/lib/avatarApi';
import { getAvatarLibrary } from '@/lib/avatarLibrary';
import { mergeEnrollmentState } from '@/lib/marketplaceUtils';
import { STARTER_AVATARS } from '@/lib/starterAvatars';
import StarterAvatarCard from '@/components/avatars/StarterAvatarCard';
import MarketplaceAvatarCard from '@/components/avatars/MarketplaceAvatarCard';
import MarketplaceAvatarPreviewModal from '@/components/avatars/MarketplaceAvatarPreviewModal';
import GlbLibraryCard from '@/components/avatars/GlbLibraryCard';
import type { AvatarPublicResponse } from '@/types/avatar';
import type { AvatarLibraryEntry } from '@/lib/avatarLibrary';
import { Bot, Search } from 'lucide-react';

export default function MarketplacePage() {
  const [avatars, setAvatars] = useState<AvatarPublicResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [previewAvatar, setPreviewAvatar] = useState<AvatarPublicResponse | AvatarLibraryEntry | null>(null);

  const libraryEntries = useMemo(() => getAvatarLibrary().avatars, []);

  const professionalLibrary = useMemo(
    () => libraryEntries.filter((entry) => entry.tags.includes('professional')),
    [libraryEntries],
  );

  const kidsLibrary = useMemo(
    () => libraryEntries.filter((entry) => entry.tags.includes('kids')),
    [libraryEntries],
  );

  useEffect(() => {
    Promise.all([
      marketplaceApi.list().catch(() => ({ avatars: [], total: 0 })),
      subscriptionApi.list().catch(() => ({ subscriptions: [], total: 0 })),
    ])
      .then(([marketplace, subscriptions]) => {
        const subscribedIds = new Set(
          (subscriptions.subscriptions ?? []).map((s: { avatar_id?: string; avatarId?: string }) =>
            s.avatar_id ?? s.avatarId ?? '',
          ),
        );
        setAvatars(mergeEnrollmentState(marketplace.avatars ?? [], subscribedIds));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load avatars'))
      .finally(() => setLoading(false));
  }, []);

  const platformLibraryIds = useMemo(
    () => new Set(libraryEntries.map((entry) => entry.id)),
    [libraryEntries],
  );

  const filtered = avatars
    .filter(
      (avatar) =>
        !platformLibraryIds.has(avatar.id) &&
        !platformLibraryIds.has(avatar.glb_library_id ?? ''),
    )
    .filter(
      (avatar) =>
        !query ||
        avatar.name.toLowerCase().includes(query.toLowerCase()) ||
        (avatar.description || '').toLowerCase().includes(query.toLowerCase()) ||
        (avatar.tagline || '').toLowerCase().includes(query.toLowerCase()),
    );

  const openAvatarPreview = (item: AvatarPublicResponse | AvatarLibraryEntry) => {
    setPreviewAvatar(item);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Marketplace</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Discover available AI avatars in your program.
        </p>
      </div>
      {/* 
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Platform Avatars</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Official avatars from the MyOS platform.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {STARTER_AVATARS.filter((sa) => sa.isAvailable).map((sa) => (
            <StarterAvatarCard key={sa.id} avatar={sa} role="subscriber" />
          ))}
        </div>
      </div> */}

      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Featured Teaching Avatars</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Salama and Sultan — portrait photos plus 3D models with on-demand speech preview.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {professionalLibrary.map((entry) => (
            <GlbLibraryCard
              key={entry.id}
              entry={entry}
              onPreview={openAvatarPreview}
            />
          ))}
        </div>
      </div>

      {kidsLibrary.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Kids Avatars</h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Playful Roblox-style 3D tutors for younger learners — Layla and Omar.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kidsLibrary.map((entry) => (
              <GlbLibraryCard
                key={entry.id}
                entry={entry}
                onPreview={openAvatarPreview}
                variant="kids"
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">All Published Avatars</h2>
          <div className="relative w-full max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#133221] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Search avatars…"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : error && avatars.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 py-10 text-center dark:border-amber-800 dark:bg-amber-950/20">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Publisher avatars are not available yet.
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-amber-700/80 dark:text-amber-400/80">
              Use the GLB library above while the backend catalog is being migrated.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white py-14 text-center dark:border-gray-700 dark:bg-gray-800">
            <Bot size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {query ? 'No avatars match your search.' : 'No publisher-created avatars yet.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((avatar) => (
              <MarketplaceAvatarCard
                key={avatar.id}
                avatar={avatar}
                onPreviewGlb={openAvatarPreview}
              />
            ))}
          </div>
        )}
      </div>

      <MarketplaceAvatarPreviewModal
        avatar={previewAvatar}
        open={!!previewAvatar}
        onClose={() => setPreviewAvatar(null)}
      />
    </div>
  );
}
