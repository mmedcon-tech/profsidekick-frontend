"use client";

import React from 'react';
import type { Avatar } from '@/types/types';
import { Check } from 'lucide-react';

interface AvatarPickerProps {
  avatars: Avatar[];
  selectedId: string | null;
  onSelect: (avatarId: string) => void;
  loading?: boolean;
  error?: string | null;
}

export default function AvatarPicker({
  avatars,
  selectedId,
  onSelect,
  loading,
  error,
}: AvatarPickerProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {avatars.map((avatar) => {
        const selected = selectedId === avatar.id;
        return (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.id)}
            className={`relative text-left p-4 rounded-xl border-2 transition-all ${
              selected
                ? 'border-blue-600 bg-blue-50 shadow-md'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300'
            }`}
          >
            {selected && (
              <span className="absolute top-3 right-3 bg-blue-600 text-white rounded-full p-0.5">
                <Check size={16} />
              </span>
            )}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold mb-3"
              style={{ backgroundColor: avatar.accentColor }}
            >
              {avatar.name.charAt(0)}
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{avatar.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{avatar.description}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Voice: {avatar.voice}</p>
          </button>
        );
      })}
    </div>
  );
}
