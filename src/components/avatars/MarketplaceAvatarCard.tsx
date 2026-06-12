'use client';

import React from 'react';
import Link from 'next/link';
import { Star, Users, BookOpen, Coins, Box } from 'lucide-react';
import AvatarIcon from '@/components/avatars/AvatarIcon';
import type { AvatarPublicResponse } from '@/types/avatar';
import {
  buildDeliveryModeChips,
  marketplaceStats,
  resolveMarketplaceGlbUrl,
} from '@/lib/marketplaceUtils';

interface MarketplaceAvatarCardProps {
  avatar: AvatarPublicResponse;
  onPreviewGlb?: (avatar: AvatarPublicResponse) => void;
}

export default function MarketplaceAvatarCard({
  avatar,
  onPreviewGlb,
}: MarketplaceAvatarCardProps): React.ReactElement {
  const stats = marketplaceStats(avatar);
  const chips = buildDeliveryModeChips(avatar);
  const enrolled = !!avatar.is_enrolled;
  const glbUrl = resolveMarketplaceGlbUrl(avatar);
  const isGlb = avatar.render_type === 'glb' || !!glbUrl;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:border-[#133221] hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div className="relative bg-gradient-to-br from-[#133221] to-[#0a1e13] px-5 pb-12 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="overflow-hidden rounded-2xl border-2 border-white/20 shadow-lg">
            <AvatarIcon
              imageUrl={avatar.template_image_url}
              name={avatar.name}
              size={72}
              rounded="lg"
            />
          </div>
          {enrolled ? (
            <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-[11px] font-semibold text-emerald-100">
              Enrolled
            </span>
          ) : (
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/80">
              Available
            </span>
          )}
        </div>
      </div>

      <div className="-mt-8 flex-1 px-5 pb-5">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="truncate text-base font-bold text-gray-900 dark:text-gray-100">
              {avatar.name}
            </h3>
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              {stats.rating.toFixed(1)}
            </span>
          </div>

          <p className="mb-3 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
            {avatar.tagline || avatar.description || 'AI-powered educational avatar.'}
          </p>

          <div className="mb-3 grid grid-cols-3 gap-2 text-center text-[10px] text-gray-500">
            <div className="rounded-lg bg-gray-50 px-2 py-1.5 dark:bg-gray-800">
              <BookOpen size={12} className="mx-auto mb-0.5 text-[#133221]" />
              <div className="font-semibold text-gray-800 dark:text-gray-200">{stats.courseCount}</div>
              <div>courses</div>
            </div>
            <div className="rounded-lg bg-gray-50 px-2 py-1.5 dark:bg-gray-800">
              <Users size={12} className="mx-auto mb-0.5 text-[#133221]" />
              <div className="font-semibold text-gray-800 dark:text-gray-200">{stats.subscriberCount}</div>
              <div>learners</div>
            </div>
            <div className="rounded-lg bg-gray-50 px-2 py-1.5 dark:bg-gray-800">
              <Coins size={12} className="mx-auto mb-0.5 text-[#133221]" />
              <div className="font-semibold text-gray-800 dark:text-gray-200">{stats.creditsPerSession}</div>
              <div>credits</div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span
                key={chip}
                className="rounded-md bg-[#FDF9EB] px-2 py-0.5 text-[10px] font-medium text-[#8B7340]"
              >
                {chip}
              </span>
            ))}
            {isGlb && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                <Box size={10} /> 3D GLB
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Link
              href={`/subscriber/marketplace/${avatar.id}`}
              className={`flex-1 rounded-xl px-3 py-2.5 text-center text-sm font-semibold transition-colors ${
                enrolled
                  ? 'bg-[#133221] text-white hover:bg-[#0a1e13]'
                  : 'border border-[#133221] text-[#133221] hover:bg-[#133221]/5'
              }`}
            >
              {enrolled ? 'View Sessions' : 'Enroll'}
            </Link>
            {isGlb && onPreviewGlb && (
              <button
                type="button"
                onClick={() => onPreviewGlb(avatar)}
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200"
              >
                3D
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
