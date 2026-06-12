'use client';

import React from 'react';
import Link from 'next/link';
import { Box, Star } from 'lucide-react';
import type { AvatarLibraryEntry } from '@/lib/avatarLibrary';

interface GlbLibraryCardProps {
  entry: AvatarLibraryEntry;
  onPreview: (entry: AvatarLibraryEntry) => void;
}

export default function GlbLibraryCard({
  entry,
  onPreview,
}: GlbLibraryCardProps): React.ReactElement {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="bg-gradient-to-br from-[#133221] to-[#0a1e13] px-5 pb-10 pt-5">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/80">
            GLB Library
          </span>
          <span className="flex items-center gap-1 text-[11px] text-amber-200">
            <Star size={11} className="fill-amber-300 text-amber-300" /> 4.9
          </span>
        </div>
      </div>

      <div className="-mt-6 flex-1 px-5 pb-5">
        <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{entry.name}</h3>
          <p className="mt-1 text-xs text-gray-500">{entry.id} · {entry.gender}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {entry.languages.map((lang) => (
              <span
                key={lang}
                className="rounded-md bg-[#FDF9EB] px-2 py-0.5 text-[10px] font-medium text-[#8B7340]"
              >
                {lang.toUpperCase()} · shimmer
              </span>
            ))}
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              <Box size={10} /> morph lip-sync
            </span>
          </div>

          <div className="mt-4 flex gap-2">
            <Link
              href={`/subscriber/marketplace/glb/${entry.id}`}
              className="flex-1 rounded-xl bg-[#133221] px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#0a1e13]"
            >
              Open
            </Link>
            <button
              type="button"
              onClick={() => onPreview(entry)}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200"
            >
              3D
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
