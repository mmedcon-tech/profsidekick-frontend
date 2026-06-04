"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { templateApi, adminAvatarApi, adminUserApi } from '@/lib/avatarApi';
import type { AvatarTemplateResponse } from '@/types/avatar';
import AvatarIcon from '@/components/avatars/AvatarIcon';
import {
  Layers, Users, ShieldCheck, Plus, ArrowRight, ChevronRight,
  BarChart2,
} from 'lucide-react';

function StatusPill({ state }: { state: string }) {
  const map: Record<string, string> = {
    published:   'bg-emerald-100 text-emerald-700',
    draft:       'bg-amber-100 text-amber-700',
    unpublished: 'bg-gray-100 text-gray-500',
    archived:    'bg-gray-100 text-gray-400',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${map[state] ?? 'bg-gray-100 text-gray-500'}`}>
      {state}
    </span>
  );
}

export default function AdminDashboard() {
  const [templateList, setTemplateList] = useState<AvatarTemplateResponse[]>([]);
  const [avatarCount,   setAvatarCount]   = useState(0);
  const [publishers,    setPublishers]    = useState(0);
  const [subscribers,   setSubscribers]   = useState(0);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    Promise.allSettled([
      templateApi.list(),
      adminAvatarApi.list(),
      adminUserApi.list('publisher'),
      adminUserApi.list('subscriber'),
    ]).then(([t, a, pub, sub]) => {
      if (t.status   === 'fulfilled') setTemplateList(t.value);
      if (a.status   === 'fulfilled') setAvatarCount(a.value.total);
      if (pub.status === 'fulfilled') setPublishers(pub.value.length);
      if (sub.status === 'fulfilled') setSubscribers(sub.value.length);
    }).finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: 'Templates',
      value: loading ? '—' : templateList.length,
      icon: <Layers size={20} className="text-indigo-600" />,
      bg: 'bg-indigo-50',
      href: '/admin/templates',
    },
    {
      label: 'Avatars',
      value: loading ? '—' : avatarCount,
      icon: <AvatarIcon imageUrl={null} name="" size={20} className="text-blue-600" />,
      bg: 'bg-blue-50',
      href: '/admin/marketplace',
    },
    {
      label: 'Publishers',
      value: loading ? '—' : publishers,
      icon: <ShieldCheck size={20} className="text-purple-600" />,
      bg: 'bg-purple-50',
      href: '/admin/publishers',
    },
    {
      label: 'Subscribers',
      value: loading ? '—' : subscribers,
      icon: <Users size={20} className="text-green-600" />,
      bg: 'bg-green-50',
      href: '/admin/subscribers',
    },
  ];

  const actions = [
    { label: 'Create Template',    href: '/admin/templates/new', icon: <Plus size={16} />,       color: 'bg-indigo-600 hover:bg-indigo-700' },
    { label: 'All Templates',      href: '/admin/templates',     icon: <Layers size={16} />,     color: 'bg-blue-600 hover:bg-blue-700'    },
    { label: 'Manage Marketplace', href: '/admin/marketplace',   icon: <ArrowRight size={16} />, color: 'bg-gray-800 hover:bg-gray-900'   },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Platform overview and management.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Avatar Templates — dynamic, links to per-template management dashboard */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Avatar Templates</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Click a template to manage its prompts, roles, publishers, courses, and sessions.
            </p>
          </div>
          <Link href="/admin/templates"
            className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
            View all <ChevronRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-gray-100 rounded" />
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : templateList.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
            <Layers size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500 mb-3">No templates yet.</p>
            <Link href="/admin/templates/new"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors">
              <Plus size={14} /> Create first template
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {templateList.filter((t) => t.is_active).map((t) => (
              <Link
                key={t.id}
                href={`/admin/avatars/${t.id}`}
                className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/40 transition-all group"
              >
                <AvatarIcon imageUrl={t.avatar_image_url} name={t.name} size={48} rounded="lg" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{t.name}</span>
                    <StatusPill state={t.published_state} />
                    {t.category && (
                      <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {t.category}
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{t.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Layers size={10} /> {t.version_count} version{t.version_count !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={10} /> {t.roles.length} role{t.roles.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Right: CTA */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    <BarChart2 size={13} /> Manage
                  </span>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {actions.map((a) => (
            <Link key={a.label} href={a.href}
              className={`flex items-center gap-2 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${a.color}`}>
              {a.icon} {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-5">
          <h3 className="font-semibold text-indigo-900 mb-2">Prompt Isolation</h3>
          <p className="text-sm text-indigo-700">
            All AI prompts are stored exclusively in Templates. Publishers and subscribers never see
            prompt content. Only admins can view or edit prompts.
          </p>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-5">
          <h3 className="font-semibold text-purple-900 mb-2">Admin Seed Script</h3>
          <p className="text-sm text-purple-700 font-mono text-xs break-all">
            python scripts/seed_admin.py --username admin --email admin@example.com --password changeme
          </p>
        </div>
      </div>
    </div>
  );
}
