'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { ArrowLeft, Box, Languages } from 'lucide-react';
import { getAvatarLibraryEntry } from '@/lib/avatarLibrary';

const GlbAvatarPreview = dynamic(
  () => import('@/components/avatar/GlbAvatarPreview'),
  { ssr: false },
);

export default function GlbLibraryDetailPage(): React.ReactElement {
  const params = useParams<{ libraryId: string }>();
  const entry = useMemo(
    () => getAvatarLibraryEntry(params.libraryId),
    [params.libraryId],
  );

  if (!entry) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-red-600">Avatar library entry not found.</p>
        <Link href="/subscriber/marketplace" className="mt-3 inline-block text-sm text-[#133221]">
          ← Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <Link
        href="/subscriber/marketplace"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} /> Marketplace
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-950 shadow-lg dark:border-gray-700">
          <div className="aspect-[4/5]">
            <GlbAvatarPreview
              glbUrl={entry.glbPath}
              lipSyncHints={entry.lipSync}
              demoSpeech
              showControls
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Box size={12} /> 3D GLB Preview
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{entry.name}</h1>
            <p className="mt-2 text-sm text-gray-500">{entry.source}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {entry.languages.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                >
                  <Languages size={12} /> {lang.toUpperCase()}
                </span>
              ))}
            </div>

            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              This local library entry is used until the backend upload API links publisher avatars
              to <code className="text-xs">avatar_3d_models.model_url</code>. Lip-sync uses morph
              targets: {entry.lipSync.morphTargets.slice(0, 3).join(', ')}…
            </p>
          </div>

          {entry.id === 'avatar-2' && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300">
              <p className="font-semibold text-gray-800 dark:text-gray-100">Upgrade to Emirati thobe GLB</p>
              <p className="mt-1 text-xs leading-relaxed">
                Sultan currently uses a Ready Player Me masculine rig with full lip-sync. Replace with a
                licensed Emirati model from CGTrader/Magnific at{' '}
                <code className="text-[11px]">public/avatars/avatar-2.glb</code> and update morph names
                in <code className="text-[11px]">manifest.json</code>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
