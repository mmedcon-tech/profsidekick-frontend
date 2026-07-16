"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { templateApi, ApiError } from '@/lib/avatarApi';
import type { AvatarTemplateResponse } from '@/types/avatar';
import { Layers, Plus, Trash2, CheckCircle, XCircle, Clock, Tag, AlertTriangle, Lock } from 'lucide-react';
import AvatarIcon from '@/components/avatars/AvatarIcon';
import { STARTER_AVATARS } from '@/lib/starterAvatars';

function PublishedBadge({ state }: { state: string }) {
  if (state === 'published') {
    return (
      <span className="flex items-center gap-1 text-xs text-primary/90 bg-primary/10 px-2 py-0.5 rounded-full font-medium">
        <CheckCircle size={10} /> Published
      </span>
    );
  }
  if (state === 'draft') {
    return (
      <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-medium">
        <Clock size={10} /> Draft
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full font-medium">
      <XCircle size={10} /> Unpublished
    </span>
  );
}

// ─── Delete confirmation modal ────────────────────────────────────────────────

interface DeleteModalProps {
  name: string;
  onDeleteTemplate: () => Promise<void>;
  onDeleteAll: () => Promise<void>;
  onCancel: () => void;
}

function DeleteModal({ name, onDeleteTemplate, onDeleteAll, onCancel }: DeleteModalProps) {
  const [busy, setBusy] = useState<'template' | 'all' | null>(null);

  const run = async (kind: 'template' | 'all') => {
    setBusy(kind);
    try {
      if (kind === 'template') await onDeleteTemplate();
      else await onDeleteAll();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl max-w-lg w-full p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Delete Template</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Choose how to delete <strong className="text-gray-800 dark:text-gray-200">{name}</strong>:
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Option A */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2">
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">Option A — Delete Template Only</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Removes this template. All publisher-created avatar instances that originated from it
              remain intact and continue to work normally. No new avatars can be created from
              this template.
            </p>
            <button
              onClick={() => run('template')}
              disabled={busy !== null}
              className="mt-1 flex items-center gap-2 text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
            >
              <Trash2 size={14} />
              {busy === 'template' ? 'Deleting…' : 'Delete Template Only'}
            </button>
          </div>

          {/* Option B */}
          <div className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-2">
            <p className="font-semibold text-sm text-red-800">Option B — Delete Template + All Avatar Instances</p>
            <p className="text-xs text-red-600">
              Permanently removes this template <em>and</em> all publisher-created avatars that
              originated from it. This action cannot be undone and will disrupt any publishers
              currently using this template.
            </p>
            <button
              onClick={() => run('all')}
              disabled={busy !== null}
              className="mt-1 flex items-center gap-2 text-sm bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800 disabled:opacity-50 transition-colors font-medium"
            >
              <Trash2 size={14} />
              {busy === 'all' ? 'Deleting…' : 'Delete Template + All Instances'}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onCancel}
            disabled={busy !== null}
            className="text-sm text-gray-600 dark:text-gray-400 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:bg-gray-900 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<AvatarTemplateResponse[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const load = () => {
    setLoading(true);
    templateApi.list()
      .then(setTemplates)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDeleteTemplate = async () => {
    if (!deleteTarget) return;
    try {
      await templateApi.delete(deleteTarget.id);
      setTemplates((p) => p.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  const handleDeleteAll = async () => {
    if (!deleteTarget) return;
    try {
      await templateApi.deleteWithInstances(deleteTarget.id);
      setTemplates((p) => p.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  // Platform starters that are not yet backed by a DB template (coming-soon placeholders)
  const dbIds = new Set(templates.map((t) => t.name.toLowerCase()));
  const placeholders = STARTER_AVATARS.filter(
    (sa) => !sa.isAvailable && !dbIds.has(sa.name.toLowerCase()),
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onDeleteTemplate={handleDeleteTemplate}
          onDeleteAll={handleDeleteAll}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Avatar Templates</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage AI persona templates that publishers instantiate into avatars.
          </p>
        </div>
        <Link
          href="/admin/templates/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} /> New Template
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-2.5 bg-gray-50 dark:bg-gray-900 rounded-t-xl">
            <div className="col-span-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Template</div>
            <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Category</div>
            <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Version</div>
            <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</div>
            <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</div>
          </div>

          {/* DB-backed templates */}
          {templates.length === 0 && placeholders.length === 0 ? (
            <div className="text-center py-16">
              <Layers size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">No templates yet. Create the first one.</p>
              <Link
                href="/admin/templates/new"
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                <Plus size={15} /> Create Template
              </Link>
            </div>
          ) : (
            <>
              {templates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => router.push(`/admin/avatars/${t.id}`)}
                  className="grid grid-cols-12 gap-4 items-center px-5 py-4 hover:bg-gray-50/40 cursor-pointer transition-colors group"
                >
                  {/* Name */}
                  <div className="col-span-4 min-w-0 flex items-center gap-2">
                    <AvatarIcon imageUrl={t.avatar_image_url} name={t.name} size={36} rounded="lg" />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-700 transition-colors">
                        {t.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{t.description || 'No description'}</p>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="col-span-2">
                    {t.category ? (
                      <span className="flex items-center gap-1 text-xs text-indigo-700 bg-gray-50 px-2 py-0.5 rounded-full">
                        <Tag size={10} /> {t.category}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>

                  {/* Version */}
                  <div className="col-span-2">
                    {t.version_count > 0 ? (
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                        v{t.current_version?.version_number ?? '—'}{' '}
                        <span className="text-gray-400 text-xs">({t.version_count} total)</span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No versions</span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="col-span-2 flex flex-col gap-1">
                    <PublishedBadge state={t.published_state} />
                    {!t.is_active && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <XCircle size={10} /> Archived
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {t.is_active && (
                      <button
                        onClick={() => setDeleteTarget({ id: t.id, name: t.name })}
                        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors whitespace-nowrap"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Coming-soon platform placeholders */}
              {placeholders.map((sa) => (
                <div
                  key={sa.id}
                  className="grid grid-cols-12 gap-4 items-center px-5 py-4 opacity-60"
                >
                  <div className="col-span-4 min-w-0 flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <Lock size={16} className="text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-700 dark:text-gray-300 truncate">{sa.name}</p>
                      <p className="text-xs text-gray-400 truncate">{sa.tagline}</p>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-gray-400">—</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-gray-400">—</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  </div>
                  <div className="col-span-2" />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
