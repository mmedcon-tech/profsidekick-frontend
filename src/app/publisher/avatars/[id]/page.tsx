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
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !avatar) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600">{error || 'Avatar not found'}</p>
        <Link href="/publisher/avatars" className="text-[#133221] hover:underline text-sm mt-2 inline-block">
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
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/publisher/avatars"
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 transition-colors w-fit">
        <ArrowLeft size={16} /> All Avatars
      </Link>

      {/* Publish success banner */}
      {publishSuccess && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Avatar published to marketplace</p>
            <p className="text-xs text-green-600 mt-0.5">
              Subscribers can now discover and use this avatar. You can continue training it at any time — publishing does not lock anything.
            </p>
          </div>
        </div>
      )}

      {/* Header card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <AvatarIcon imageUrl={avatar.template_image_url} name={avatar.name} size={56} rounded="lg" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{avatar.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{avatar.description || 'No description'}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  avatar.is_published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {avatar.is_published ? '● Published' : '○ Unpublished draft'}
                </span>
                {avatar.configuration && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#BA984E]/20 text-[#133221] font-medium">
                    Configured
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  Last updated {fmtDate(avatar.updated_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Publish / Publish Updates button */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <button
              onClick={handlePublish}
              disabled={publishing}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                avatar.is_published
                  ? 'bg-[#133221] hover:bg-[#0a1e13] text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}>
              {publishing ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Publishing…</>
              ) : avatar.is_published ? (
                <><RefreshCw size={15} /> Publish Updates</>
              ) : (
                <><Globe size={15} /> Publish to Marketplace</>
              )}
            </button>
            {avatar.is_published && (
              <p className="text-xs text-gray-400 text-right max-w-[180px]">
                Publishing a new version does not affect existing subscriber sessions.
              </p>
            )}
          </div>
        </div>

        {/* Training workflow explanation (when already published) */}
        {avatar.is_published && (
          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Publisher Training Loop</p>
            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 dark:text-gray-400">
              {[
                { icon: <Settings size={11} />, label: 'Configure' },
                { icon: <Upload size={11} />, label: 'Upload Materials' },
                { icon: <BookOpen size={11} />, label: 'Run Sessions' },
                { icon: <Send size={11} />, label: 'Chat & Refine' },
                { icon: <Globe size={11} />, label: 'Publish Updates' },
              ].map((step, i) => (
                <React.Fragment key={step.label}>
                  <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1">
                    {step.icon} {step.label}
                  </div>
                  {i < 4 && <span className="text-gray-300">→</span>}
                </React.Fragment>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              You can continue training at any time. Click &quot;Publish Updates&quot; when you&apos;re ready to release a new version to subscribers.
            </p>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 dark:border-gray-700 flex gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <Link key={tab.label} href={tab.href(id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              isTabActive(tab)
                ? 'border-[#133221] text-[#133221]'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'
            }`}>
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Overview content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Avatar Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Created</p><p className="font-medium">{fmtDate(avatar.created_at)}</p></div>
          <div><p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Last updated</p><p className="font-medium">{fmtDate(avatar.updated_at)}</p></div>
          <div><p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Status</p><p className={`font-medium ${avatar.is_published ? 'text-green-700' : 'text-amber-700'}`}>{avatar.is_published ? 'Published' : 'Draft'}</p></div>
          {avatar.configuration && (
            <>
              <div><p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Voice</p><p className="font-medium capitalize">{avatar.configuration.voice || 'Default'}</p></div>
              <div><p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Difficulty</p><p className="font-medium capitalize">{avatar.configuration.difficulty_level || 'Not set'}</p></div>
              <div><p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Knowledge docs</p><p className="font-medium">{avatar.configuration.knowledge_documents.length}</p></div>
              <div><p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Reference solutions</p><p className="font-medium">{avatar.configuration.reference_solutions.length}</p></div>
              <div><p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Rubrics</p><p className="font-medium">{avatar.configuration.rubrics.length}</p></div>
            </>
          )}
        </div>

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
                step.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
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
              className="flex-1 min-w-[140px] text-center py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
              {publishing ? 'Publishing…' : 'Publish to Marketplace →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
