'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Languages, Mic2, Sparkles } from 'lucide-react';
import AvatarShowcase from '@/components/avatar/AvatarShowcase';
import { getAvatarLibraryEntry } from '@/lib/avatarLibrary';

export default function GlbLibraryDetailPage(): React.ReactElement {
  const params = useParams<{ libraryId: string }>();
  const entry = useMemo(
    () => getAvatarLibraryEntry(params.libraryId),
    [params.libraryId],
  );

  if (!entry) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-red-600">Avatar not found.</p>
        <Link href="/subscriber/marketplace" className="mt-3 inline-block text-sm text-[#133221]">
          ← Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <Link
        href="/subscriber/marketplace"
        className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
      >
        <ArrowLeft size={16} /> Marketplace
      </Link>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <AvatarShowcase entry={entry} />

          <div className="flex flex-col justify-between p-6 sm:p-8">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Sparkles size={12} /> MyOS Avatar
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                {entry.name}
              </h1>
              <p className="mt-2 text-base text-emerald-700 dark:text-emerald-400">
                {entry.tagline}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {entry.description}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {entry.languages.map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <Languages size={12} /> {lang === 'ar' ? 'Arabic' : 'English'}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  <Mic2 size={12} /> Lip-sync during teaching
                </span>
              </div>
            </div>

            <div className="mt-8 space-y-2 text-center text-xs leading-relaxed text-gray-400">
              <p>
                Switch between portrait and 3D model. Lip-sync runs only when you preview speech or
                during a live teaching session.
              </p>
              {entry.id === 'avatar-2' && entry.recommendedModelUrl && (
                <p>
                  For a thobe/kandura Emirati rig, download a licensed GLB from{' '}
                  <a
                    href={entry.recommendedModelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 underline hover:text-emerald-700"
                  >
                    Sketchfab Arab Man
                  </a>{' '}
                  and run{' '}
                  <code className="text-[10px]">./scripts/install-sultan-glb.sh your-file.glb</code>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
