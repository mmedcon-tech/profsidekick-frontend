"use client";

import React from 'react';
import Link from 'next/link';
import { Bot, Lock, ArrowRight } from 'lucide-react';
import { type StarterAvatar, ACCENT } from '@/lib/starterAvatars';

interface Props {
  avatar: StarterAvatar;
  role: 'publisher' | 'subscriber' | 'admin';
  /** Render as a wide horizontal row (publisher avatar list) */
  horizontal?: boolean;
}

export default function StarterAvatarCard({ avatar, role, horizontal = false }: Props) {
  const ac   = ACCENT[avatar.accentColor];
  const href =
    role === 'admin'
      ? avatar.adminHref
      : role === 'publisher'
      ? avatar.publisherHref
      : avatar.subscriberHref;
  const disabled = !avatar.isAvailable;

  const ctaLabel =
    role === 'admin'
      ? 'View Analytics'
      : avatar.id === '__profsidekick__'
      ? role === 'publisher'
        ? 'Continue with ProfSidekick'
        : 'Start Learning'
      : role === 'publisher'
      ? 'Open Avatar'
      : 'Explore';

  /* ── card contents ────────────────────────────────────────────── */
  const contents = horizontal ? (
    /* horizontal: icon | text | cta */
    <>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${ac.icon}`}>
        {disabled ? <Lock size={20} /> : <Bot size={20} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm">{avatar.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${ac.badge}`}>
            {avatar.badge}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{avatar.tagline}</p>
        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{avatar.description}</p>
      </div>

      <div className="flex-shrink-0">
        {disabled ? (
          <span className="flex items-center gap-1 text-xs text-gray-400 border border-gray-200 px-3 py-1.5 rounded-lg">
            <Lock size={10} /> Coming Soon
          </span>
        ) : (
          <span className={`flex items-center gap-1.5 text-xs font-semibold text-white px-4 py-2 rounded-lg ${ac.btn} transition-colors`}>
            {ctaLabel} <ArrowRight size={13} />
          </span>
        )}
      </div>
    </>
  ) : (
    /* vertical: icon / text / cta stacked */
    <>
      {/* Top row: icon + badge */}
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${ac.icon}`}>
          {disabled ? <Lock size={22} /> : <Bot size={22} />}
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ac.badge}`}>
          {avatar.badge}
        </span>
      </div>

      {/* Name + tagline + description */}
      <p className="font-bold text-gray-900">{avatar.name}</p>
      <p className="text-xs text-blue-600 font-medium mt-0.5">{avatar.tagline}</p>
      <p className="text-xs text-gray-400 mt-2 line-clamp-3 flex-1">{avatar.description}</p>

      {/* CTA */}
      <div className="mt-4">
        {disabled ? (
          <span className="flex items-center justify-center gap-1 text-xs text-gray-400 border border-gray-200 px-3 py-2 rounded-lg w-full">
            <Lock size={11} /> Coming Soon
          </span>
        ) : (
          <span className={`flex items-center justify-center gap-1.5 text-sm font-semibold text-white px-4 py-2.5 rounded-lg w-full ${ac.btn} transition-colors`}>
            {ctaLabel} <ArrowRight size={14} />
          </span>
        )}
      </div>
    </>
  );

  /* ── wrapper ──────────────────────────────────────────────────── */
  const wrapperClass = [
    'rounded-xl border-2 border-gray-200 bg-white transition-all',
    horizontal ? 'flex items-center gap-4 p-4' : 'flex flex-col p-5',
    !disabled && avatar.id === '__profsidekick__'
      ? `ring-2 ring-blue-200 border-blue-300 ${ac.border} hover:shadow-lg`
      : !disabled
      ? `${ac.border} hover:shadow-md`
      : 'opacity-60 cursor-not-allowed',
  ].join(' ');

  if (disabled) return <div className={wrapperClass}>{contents}</div>;

  return (
    <Link href={href} className={wrapperClass}>
      {contents}
    </Link>
  );
}
