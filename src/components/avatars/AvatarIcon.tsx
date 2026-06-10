"use client";

/**
 * AvatarIcon — displays a template's avatar image if available,
 * falls back to a styled Bot icon with the template initial.
 *
 * Usage:
 *   <AvatarIcon imageUrl={template.avatar_image_url} name={template.name} size={40} />
 */

import React from 'react';
import { Bot } from 'lucide-react';
import { config } from '@/lib/config';

interface Props {
  imageUrl?: string | null;
  name: string;
  size?: number;
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

export default function AvatarIcon({
  imageUrl,
  name,
  size = 32,
  className = '',
  rounded = 'lg',
}: Props) {
  const roundedClass = {
    sm:   'rounded',
    md:   'rounded-md',
    lg:   'rounded-lg',
    full: 'rounded-full',
  }[rounded];

  const resolvedUrl = imageUrl
    ? (imageUrl.startsWith('http') ? imageUrl : config.getApiUrl(imageUrl))
    : null;

  if (resolvedUrl) {
    return (
      <img
        src={resolvedUrl}
        alt={name}
        width={size}
        height={size}
        className={`object-cover flex-shrink-0 ${roundedClass} ${className}`}
        style={{ width: size, height: size }}
        onError={(e) => {
          // fall back to placeholder on load error
          const img = e.target as HTMLImageElement;
          img.style.display = 'none';
          const sib = img.nextElementSibling as HTMLElement | null;
          if (sib) sib.style.display = 'flex';
        }}
      />
    );
  }

  const iconSize = Math.round(size * 0.45);

  return (
    <div
      className={`bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0 ${roundedClass} ${className}`}
      style={{ width: size, height: size }}
    >
      <Bot size={iconSize} className="text-emerald-700 dark:text-emerald-400" />
    </div>
  );
}
