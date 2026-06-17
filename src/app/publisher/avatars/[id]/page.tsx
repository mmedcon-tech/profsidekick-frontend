"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { avatarApi, ApiError } from '@/lib/avatarApi';
import type { AvatarResponse } from '@/types/avatar';
import { Globe, ArrowLeft, RefreshCw, CheckCircle, Upload, BookOpen, Settings, Send } from 'lucide-react';
import AvatarIcon from '@/components/avatars/AvatarIcon';

const TABS = [
  { label: 'Overview',            href: (id: string) => `/publisher/avatars/${id}`,            exact: true  },
  { label: 'Courses & Sessions',  href: (id: string) => `/publisher/avatars/${id}/courses`,    exact: false },
  { label: 'Configure',           href: (id: string) => `/publisher/avatars/${id}/configure`,  exact: false },
  { label: 'Knowledge',           href: (id: string) => `/publisher/avatars/${id}/knowledge`,  exact: false },
  { label: 'References',          href: (id: string) => `/publisher/avatars/${id}/references`, exact: false },
  { label: 'Rubrics',             href: (id: string) => `/publisher/avatars/${id}/rubrics`,    exact: false },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AvatarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const [avatar, setAvatar]         = useState<AvatarResponse | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const load = () => {
    setLoading(true);
    avatarApi.get(id)
      .then(setAvatar)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load avatar'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handlePublish = async () => {
    if (!avatar) return;
    setPublishing(true);
    try {
      const updated = await avatarApi.publish(id);
      setAvatar((prev) => prev ? { ...prev, is_published: updated.is_published, updated_at: new Date().toISOString() } : prev);
      setPublishSuccess(true);
      setTimeout(() => setPublishSuccess(false), 4000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Publish failed — configure the avatar first.');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-64 bg-card rounded animate-pulse" />
        <div className="h-32 bg-card rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !avatar) {
    return (
      <div className="text-center py-20 bg-card rounded-xl border border-border">
        <p className="text-red-500">{error || 'Avatar not found'}</p>
        <Link href="/publisher/avatars" className="text-primary hover:underline text-sm mt-2 inline-block">
          ← Back to avatars
        </Link>
      </div>
    );
  }

  const isTabActive = (tab: typeof TABS[0]) => {
    const href = tab.href(id);
    return tab.exact ? pathname === href : pathname.startsWith(href);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/publisher/avatars"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
          <ArrowLeft size={16} /> Back to Avatars
        </Link>
      </div>

      {/* Publish success banner */}
      {publishSuccess && (
        <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-xl">
          <CheckCircle size={18} className="text-primary/50 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-primary dark:text-primary/40">Avatar published to marketplace</p>
            <p className="text-xs text-primary/80 dark:text-primary/40/80 mt-0.5">
              Subscribers can now discover and use this avatar. You can continue training it at any time.
            </p>
          </div>
        </div>
      )}

      {/* Header card (V2 Design) */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-5 bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted flex items-center justify-center">
          {avatar.template_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar.template_image_url} alt={avatar.name} className="object-cover w-full h-full" />
          ) : (
            <span className="text-2xl font-bold text-muted-foreground uppercase">{avatar.name.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{avatar.name}</h1>
            <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${
              avatar.is_published ? 'bg-primary/10 text-primary/50 border-primary/20' : 'bg-muted text-muted-foreground border-border'
            }`}>
              {avatar.is_published ? 'Published' : 'Draft'}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{avatar.description || 'No description'}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> Template: {avatar.template_name || 'Custom'}</span>
            <span className="flex items-center gap-1"><Settings className="h-3.5 w-3.5" /> Updated: {fmtDate(avatar.updated_at)}</span>
          </div>
        </div>

        {/* Publish / Publish Updates button */}
        <div className="flex flex-col sm:items-end gap-2 flex-shrink-0 mt-4 sm:mt-0">
          <button
            onClick={handlePublish}
            disabled={publishing}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              avatar.is_published
                ? 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}>
            {publishing ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Publishing…</>
            ) : avatar.is_published ? (
              <><RefreshCw size={15} /> Publish Updates</>
            ) : (
              <><Globe size={15} /> Publish Avatar</>
            )}
          </button>
        </div>
      </div>

      {/* Tab bar (V2 Design) */}
      <div className="border-b border-border flex gap-2 overflow-x-auto">
        {TABS.map((tab) => (
          <Link key={tab.label} href={tab.href(id)}
            className={`px-4 pb-2.5 pt-1 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              isTabActive(tab)
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Overview content */}
      <div className="space-y-6">

        {/* Setup checklist */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Setup checklist</p>
          {[
            { done: !!avatar.configuration,                                      label: 'Configure voice & difficulty' },
            { done: (avatar.configuration?.knowledge_documents.length ?? 0) > 0, label: 'Upload knowledge documents' },
            { done: (avatar.configuration?.rubrics.length ?? 0) > 0,             label: 'Add grading rubrics' },
            { done: avatar.is_published,                                          label: 'Publish to marketplace' },
          ].map((step) => (
            <div key={step.label} className="flex items-center gap-2 text-sm">
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                step.done ? 'bg-primary/50 border-primary/50 text-white' : 'border-gray-300'
              }`}>
                {step.done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 5l2 2 4-4"/></svg>}
              </span>
              <span className={step.done ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'}>{step.label}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="pt-2 flex gap-3 flex-wrap">
          <Link href={`/publisher/avatars/${id}/courses`}
            className="flex-1 min-w-[140px] text-center py-2.5 bg-[#133221] text-white text-sm font-medium rounded-lg hover:bg-[#0a1e13] transition-colors">
            Manage Courses &amp; Sessions →
          </Link>
          {!avatar.configuration && (
            <Link href={`/publisher/avatars/${id}/configure`}
              className="flex-1 min-w-[140px] text-center py-2.5 border border-gray-300 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors">
              Configure First →
            </Link>
          )}
          {!avatar.is_published && (
            <button onClick={handlePublish} disabled={publishing}
              className="flex-1 min-w-[140px] text-center py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {publishing ? 'Publishing…' : 'Publish to Marketplace →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
