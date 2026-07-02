"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { avatarApi, ApiError } from '@/lib/avatarApi';
import type { AvatarSummary } from '@/types/avatar';
import { Bot, Plus, Trash2, Globe, EyeOff } from 'lucide-react';
import AvatarIcon from '@/components/avatars/AvatarIcon';

type Tab = 'all' | 'published' | 'draft';

export default function MyAvatarsPage() {
  const [avatars, setAvatars] = useState<AvatarSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [tab, setTab]       = useState<Tab>('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    avatarApi.list()
      .then((r) => { setAvatars(r.avatars); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = avatars.filter((a) =>
    tab === 'all' ? true : tab === 'published' ? a.is_published : !a.is_published
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this avatar? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await avatarApi.delete(id);
      setAvatars((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const handlePublishToggle = async (a: AvatarSummary) => {
    if (a.is_published) {
      alert('Unpublishing is not yet supported via UI. Contact your admin.');
      return;
    }
    setPublishing(a.id);
    try {
      const updated = await avatarApi.publish(a.id);
      setAvatars((prev) => prev.map((x) => x.id === a.id ? { ...x, is_published: updated.is_published } : x));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Publish failed. Make sure a configuration exists first.');
    } finally {
      setPublishing(null);
    }
  };

  const TABS: { value: Tab; label: string }[] = [
    { value: 'all',       label: `All (${avatars.length})` },
    { value: 'published', label: `Published (${avatars.filter((a) => a.is_published).length})` },
    { value: 'draft',     label: `Draft (${avatars.filter((a) => !a.is_published).length})` },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Avatars</h1>
        <Link href="/publisher/avatars/new"
          className="flex items-center gap-2 bg-[#133221] text-white px-4 py-2.5 rounded-lg hover:bg-[#0a1e13] transition-colors text-sm font-medium">
          <Plus size={16} /> Create Avatar
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((t) => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.value
                ? 'border-[#133221] text-[#133221]'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-44 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-red-600 mb-2">{error}</p>
          <button onClick={load} className="text-[#133221] hover:underline text-sm">Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Bot size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {tab === 'all' ? 'No avatars yet. Create one from a template to get started.' : `No ${tab} avatars.`}
          </p>
          <Link href="/publisher/avatars/new"
            className="inline-flex items-center gap-2 bg-[#133221] text-white px-4 py-2 rounded-lg hover:bg-[#0a1e13] transition-colors text-sm">
            <Plus size={15} /> Create your first avatar
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <div key={a.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <AvatarIcon imageUrl={a.template_image_url} name={a.name} size={40} rounded="lg" />
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  a.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {a.is_published ? 'Published' : 'Draft'}
                </span>
              </div>

              <div>
                <Link href={`/publisher/avatars/${a.id}`}
                  className="font-semibold text-gray-900 dark:text-gray-100 hover:text-[#133221] transition-colors line-clamp-1">
                  {a.name}
                </Link>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                  {a.description || 'No description'}
                </p>
              </div>

              <div className="flex gap-2 mt-auto">
                <Link href={`/publisher/avatars/${a.id}`}
                  className="flex-1 text-center text-sm border border-gray-300 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors">
                  Manage
                </Link>
                <button
                  onClick={() => handlePublishToggle(a)}
                  disabled={!!publishing}
                  title={a.is_published ? 'Unpublish' : 'Publish to marketplace'}
                  className="p-1.5 text-gray-400 hover:text-[#133221] transition-colors disabled:opacity-40">
                  {a.is_published ? <EyeOff size={16} /> : <Globe size={16} />}
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  disabled={deleting === a.id}
                  title="Delete"
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
