'use client';

import React from 'react';
import { X } from 'lucide-react';
import AvatarShowcase from '@/components/avatar/AvatarShowcase';
import { getAvatarLibraryEntry } from '@/lib/avatarLibrary';
import type { AvatarPublicResponse } from '@/types/avatar';
import type { AvatarLibraryEntry } from '@/lib/avatarLibrary';

interface MarketplaceAvatarPreviewModalProps {
  avatar: AvatarPublicResponse | AvatarLibraryEntry | null;
  open: boolean;
  onClose: () => void;
}

export default function MarketplaceAvatarPreviewModal({
  avatar,
  open,
  onClose,
}: MarketplaceAvatarPreviewModalProps): React.ReactElement | null {
  if (!open || !avatar) return null;

  const name = 'name' in avatar ? avatar.name : '';
  const libraryEntry =
    'glb_library_id' in (avatar as AvatarPublicResponse)
      ? getAvatarLibraryEntry((avatar as AvatarPublicResponse).glb_library_id ?? '')
      : 'lipSync' in avatar
        ? (avatar as AvatarLibraryEntry)
        : undefined;

  const thumbnail =
    libraryEntry?.thumbnailPath ??
    ('thumbnailPath' in avatar ? avatar.thumbnailPath : undefined) ??
    ('template_image_url' in avatar ? (avatar as AvatarPublicResponse).template_image_url : undefined);

  if (!libraryEntry && !thumbnail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="rounded-2xl bg-white p-8 text-center dark:bg-gray-900">
          <p className="text-sm text-gray-500">Preview not available yet.</p>
          <button type="button" onClick={onClose} className="mt-4 text-sm text-[#133221]">
            Close
          </button>
        </div>
      </div>
    );
  }

  const showcaseEntry: AvatarLibraryEntry = libraryEntry ?? {
    id: 'preview',
    name,
    gender: 'neutral',
    languages: [],
    tags: [],
    glbPath: '/avatars/avatar-1.glb',
    thumbnailPath: thumbnail ?? '/images/avatar-female.png',
    lipSync: { morphTargets: [], blinkTargets: [], jawBones: [] },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{name}</h3>
            <p className="text-xs text-gray-500">Portrait or 3D · speech on demand</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-[520px]">
          <AvatarShowcase entry={showcaseEntry} className="min-h-[520px]" defaultTab="portrait" />
        </div>
      </div>
    </div>
  );
}
