'use client';

import React from 'react';
import { X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { getAvatarLibraryEntry } from '@/lib/avatarLibrary';
import { resolveMarketplaceGlbUrl } from '@/lib/marketplaceUtils';
import type { AvatarPublicResponse } from '@/types/avatar';
import type { AvatarLibraryEntry } from '@/lib/avatarLibrary';

const GlbAvatarPreview = dynamic(
  () => import('@/components/avatar/GlbAvatarPreview'),
  { ssr: false },
);

interface MarketplaceAvatarPreviewModalProps {
  avatar: AvatarPublicResponse | AvatarLibraryEntry | null;
  glbUrl?: string | null;
  open: boolean;
  onClose: () => void;
}

export default function MarketplaceAvatarPreviewModal({
  avatar,
  glbUrl,
  open,
  onClose,
}: MarketplaceAvatarPreviewModalProps): React.ReactElement | null {
  if (!open || !avatar) return null;

  const name = 'name' in avatar ? avatar.name : '';
  const resolvedUrl =
    glbUrl ??
    ('glb_preview_url' in avatar ? resolveMarketplaceGlbUrl(avatar as AvatarPublicResponse) : null) ??
    ('glbPath' in avatar ? avatar.glbPath : null);

  const libraryEntry =
    'glb_library_id' in (avatar as AvatarPublicResponse)
      ? getAvatarLibraryEntry((avatar as AvatarPublicResponse).glb_library_id ?? '')
      : 'lipSync' in avatar
      ? (avatar as AvatarLibraryEntry)
      : undefined;

  const lipSyncHints = libraryEntry?.lipSync;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{name}</h3>
            <p className="text-xs text-gray-500">3D preview · idle motion + demo lip-sync</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="aspect-[4/5] bg-gray-950">
          {resolvedUrl ? (
            <GlbAvatarPreview
              glbUrl={resolvedUrl}
              lipSyncHints={lipSyncHints}
              demoSpeech
              showControls
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              No GLB model linked yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
