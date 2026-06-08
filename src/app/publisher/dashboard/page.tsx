"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { avatarApi } from '@/lib/avatarApi';
import type { AvatarSummary } from '@/types/avatar';
import { Bot, Plus, BarChart2, BookOpen, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import AvatarIcon from '@/components/avatars/AvatarIcon';

/** ProfSidekick avatars (created from the ProfSidekick template) route to
 *  the existing course/session dashboard instead of the avatar detail page. */
function isProfSidekickAvatar(a: AvatarSummary): boolean {
  return (a.template_name ?? '').toLowerCase() === 'profsidekick';
}

function avatarHref(a: AvatarSummary): string {
  return isProfSidekickAvatar(a) ? '/publisher/courses' : `/publisher/avatars/${a.id}`;
}

function avatarCta(a: AvatarSummary): string {
  return isProfSidekickAvatar(a) ? 'Continue Learning →' : 'Courses & Sessions →';
}

export default function PublisherDashboard() {
  const { user } = useAuth();
  const [avatars,       setAvatars]      = useState<AvatarSummary[]>([]);
  const [avatarError,   setAvatarError]  = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(true);

  const load = () => {
    setAvatarLoading(true);
    setAvatarError(null);
    avatarApi.list()
      .then((r) => setAvatars(r.avatars))
      .catch((e) => setAvatarError(e.message ?? 'Failed to load avatars'))
      .finally(() => setAvatarLoading(false));
  };

  useEffect(load, []);

  const published = avatars.filter((a) => a.is_published).length;
  const drafts    = avatars.filter((a) => !a.is_published).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome back, {user?.firstName}!</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Select an avatar to manage its courses, sessions, and content.
          </p>
        </div>
        <Link href="/publisher/avatars/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <Plus size={16} /> Create Avatar
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'My Avatars', value: avatarLoading ? null : avatars.length, icon: <Bot size={20} className="text-blue-600" />,    bg: 'bg-blue-50' },
          { label: 'Published',  value: avatarLoading ? null : published,      icon: <BarChart2 size={20} className="text-green-600" />, bg: 'bg-green-50' },
          { label: 'Drafts',     value: avatarLoading ? null : drafts,         icon: <BookOpen size={20} className="text-yellow-600" />, bg: 'bg-yellow-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value ?? '—'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── My Avatars ────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">My Avatars</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              All your avatar instances. Click an avatar to manage its courses, sessions, and content.
            </p>
          </div>
          <button onClick={load} title="Refresh" className="text-gray-400 hover:text-gray-600 dark:text-gray-400 transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>

        {avatarLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2].map((i) => <div key={i} className="h-36 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
          </div>

        ) : avatarError ? (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700 font-medium">Could not load avatars</p>
              <p className="text-xs text-red-600 mt-0.5">{avatarError}</p>
              <button onClick={load} className="mt-1 text-xs text-red-700 underline">Retry</button>
            </div>
          </div>

        ) : avatars.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            <Bot size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No avatars yet</p>
            <p className="text-gray-400 text-xs mt-1 mb-4">
              Create an avatar from a template to get started.
            </p>
            <Link href="/publisher/avatars/new"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
              <Plus size={14} /> Create Avatar
            </Link>
          </div>

        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {avatars.map((a) => (
              <Link
                key={a.id}
                href={avatarHref(a)}
                className="group block p-5 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <AvatarIcon imageUrl={a.template_image_url} name={a.name} size={44} rounded="lg" />
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    a.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {a.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors text-sm line-clamp-1">
                  {a.name}
                </p>
                {a.template_name && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Based on <span className="font-medium text-gray-500 dark:text-gray-400">{a.template_name}</span>
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{a.description || ''}</p>
                <p className="mt-3 text-xs text-blue-600 font-medium group-hover:underline flex items-center gap-1">
                  {avatarCta(a)} <ArrowRight size={11} />
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
