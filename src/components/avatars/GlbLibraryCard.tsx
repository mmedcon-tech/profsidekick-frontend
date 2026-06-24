'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Languages, Mic2, Sparkles, Star } from 'lucide-react';
import type { AvatarLibraryEntry } from '@/lib/avatarLibrary';

interface GlbLibraryCardProps {
  entry: AvatarLibraryEntry;
  onPreview: (entry: AvatarLibraryEntry) => void;
  variant?: 'default' | 'kids';
}

export default function GlbLibraryCard({
  entry,
  onPreview,
  variant = 'default',
}: GlbLibraryCardProps): React.ReactElement {
  const isKids = variant === 'kids' || entry.tags.includes('kids');
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:border-[#133221]/40 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className={`relative px-5 pb-14 pt-5 ${isKids ? 'bg-gradient-to-br from-[#1d3557] via-[#14213d] to-[#0b1320]' : 'bg-gradient-to-br from-[#133221] via-[#0f281c] to-[#0a1e13]'}`}>
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-100">
            <Sparkles size={10} /> {isKids ? 'Kids · 3D' : 'Portrait + 3D'}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-200">
            <Star size={11} className="fill-amber-300 text-amber-300" /> 4.9
          </span>
        </div>
      </div>

      <div className="-mt-12 flex-1 px-5 pb-5">
        <div className="relative mx-auto mb-4 h-36 w-36 overflow-hidden rounded-2xl border-4 border-white bg-[#0d1812] shadow-xl ring-1 ring-black/5 dark:border-gray-700">
          <Image
            src={entry.thumbnailPath}
            alt={entry.name}
            fill
            className="object-contain object-center p-1"
            sizes="144px"
          />
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{entry.name}</h3>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
            {entry.tagline ?? 'AI teaching avatar'}
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {entry.languages.map((lang) => (
              <span
                key={lang}
                className="inline-flex items-center gap-1 rounded-md bg-[#FDF9EB] px-2 py-0.5 text-[10px] font-medium text-[#8B7340]"
              >
                <Languages size={10} /> {lang.toUpperCase()}
              </span>
            ))}
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Mic2 size={10} /> Lip-sync
            </span>
          </div>

          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {entry.description}
          </p>

          <div className="mt-4 flex gap-2">
            <Link
              href={`/subscriber/marketplace/glb/${entry.id}`}
              className="flex-1 rounded-xl bg-[#133221] px-3 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[#0a1e13]"
            >
              View profile
            </Link>
            <button
              type="button"
              onClick={() => onPreview(entry)}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Preview
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
