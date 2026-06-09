"use client";

/**
 * Unified Avatar Instance Management Dashboard
 *
 * Reached when an admin clicks a publisher avatar in Marketplace Management.
 * Provides the same depth of management as the template management page:
 *
 *   Overview      — avatar details, template link, quick stats
 *   Configuration — voice, language, difficulty; rubrics & knowledge docs
 *   Roles         — full CRUD on the parent template's roles
 */

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { adminAvatarApi, templateApi, ApiError } from '@/lib/avatarApi';
import type {
  AvatarResponse,
  AvatarTemplateDetailResponse,
  AvatarTemplateRoleResponse,
} from '@/types/avatar';
import AvatarIcon from '@/components/avatars/AvatarIcon';
import {
  ArrowLeft, Users, Layers, Globe, Settings, BarChart2,
  Plus, Trash2, GripVertical, Save,
} from 'lucide-react';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function StatusPill({ published }: { published: boolean }) {
  return published ? (
    <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
      <Globe size={10} /> Live
    </span>
  ) : (
    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
      Draft
    </span>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  avatar,
  template,
}: {
  avatar: AvatarResponse;
  template: AvatarTemplateDetailResponse | null;
}) {
  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-400 text-xs mb-0.5">Avatar Name</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{avatar.name}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-0.5">Status</p>
          <StatusPill published={avatar.is_published} />
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-0.5">Description</p>
          <p className="text-gray-700 dark:text-gray-300">{avatar.description || '—'}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-0.5">Created</p>
          <p className="text-gray-700 dark:text-gray-300">{fmt(avatar.created_at)}</p>
        </div>
        {template && (
          <div className="md:col-span-2">
            <p className="text-gray-400 text-xs mb-0.5">Parent Template</p>
            <Link
              href={`/admin/avatars/${template.id}`}
              className="text-indigo-600 hover:underline font-medium"
            >
              {template.name} →
            </Link>
          </div>
        )}
      </div>

      {avatar.configuration && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Configuration</p>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <dt className="text-gray-400 text-xs">Voice</dt>
              <dd className="font-medium text-gray-800 dark:text-gray-200">{avatar.configuration.voice || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs">Language</dt>
              <dd className="font-medium text-gray-800 dark:text-gray-200">{avatar.configuration.language || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs">Difficulty</dt>
              <dd className="font-medium text-gray-800 dark:text-gray-200">{avatar.configuration.difficulty_level || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs">Rubrics</dt>
              <dd className="font-medium text-gray-800 dark:text-gray-200">{avatar.configuration.rubrics.length}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs">Knowledge Docs</dt>
              <dd className="font-medium text-gray-800 dark:text-gray-200">{avatar.configuration.knowledge_documents.length}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs">Reference Solutions</dt>
              <dd className="font-medium text-gray-800 dark:text-gray-200">{avatar.configuration.reference_solutions.length}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

// ─── Configuration Tab ────────────────────────────────────────────────────────

function ConfigurationTab({ avatar }: { avatar: AvatarResponse }) {
  const cfg = avatar.configuration;

  if (!cfg) {
    return (
      <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
        <Settings size={32} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">No configuration set for this avatar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Basic settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">Basic Settings</p>
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {[
            { label: 'Voice', value: cfg.voice },
            { label: 'Language', value: cfg.language },
            { label: 'Difficulty Level', value: cfg.difficulty_level },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-gray-400 mb-0.5">{label}</dt>
              <dd className="font-medium text-gray-800 dark:text-gray-200">{value || '—'}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Rubrics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
          Rubrics ({cfg.rubrics.length})
        </p>
        {cfg.rubrics.length === 0 ? (
          <p className="text-xs text-gray-400">No rubrics uploaded.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {cfg.rubrics.map((r) => (
              <li key={r.id} className="py-2 text-sm text-gray-700 dark:text-gray-300">{r.title}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Knowledge docs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
          Knowledge Documents ({cfg.knowledge_documents.length})
        </p>
        {cfg.knowledge_documents.length === 0 ? (
          <p className="text-xs text-gray-400">No knowledge documents uploaded.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {cfg.knowledge_documents.map((d) => (
              <li key={d.id} className="py-2 text-sm text-gray-700 dark:text-gray-300">
                {d.title} {d.file_name && <span className="text-xs text-gray-400">({d.file_name})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Reference solutions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
          Reference Solutions ({cfg.reference_solutions.length})
        </p>
        {cfg.reference_solutions.length === 0 ? (
          <p className="text-xs text-gray-400">No reference solutions uploaded.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {cfg.reference_solutions.map((s) => (
              <li key={s.id} className="py-2 text-sm text-gray-700 dark:text-gray-300">
                {s.title} {s.file_name && <span className="text-xs text-gray-400">({s.file_name})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Role Row ─────────────────────────────────────────────────────────────────

function RoleRow({
  role,
  templateId,
  onUpdated,
  onDeleted,
}: {
  role: AvatarTemplateRoleResponse;
  templateId: string;
  onUpdated: (r: AvatarTemplateRoleResponse) => void;
  onDeleted: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm]         = useState({
    name: role.name,
    description: role.description ?? '',
    prompt_context: role.prompt_context ?? '',
  });
  const [saving, setSaving]   = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const set = (f: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const updated = await templateApi.updateRole(templateId, role.id, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        prompt_context: form.prompt_context.trim() || undefined,
      });
      onUpdated(updated);
      setExpanded(false);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const updated = await templateApi.updateRole(templateId, role.id, {
        is_enabled: !role.is_enabled,
      });
      onUpdated(updated);
    } catch { /* ignore */ } finally { setToggling(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      await templateApi.deleteRole(templateId, role.id);
      onDeleted(role.id);
    } catch (e) { alert(e instanceof ApiError ? e.message : 'Delete failed'); }
  };

  return (
    <div
      className={`border rounded-xl ${role.is_enabled ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800' : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900'}`}
    >
      <div className="flex items-center gap-3 p-4">
        <GripVertical size={16} className="text-gray-300 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-medium text-sm ${role.is_enabled ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
              {role.name}
            </p>
            {!role.is_enabled && (
              <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">Disabled</span>
            )}
          </div>
          {role.description && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{role.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors disabled:opacity-40"
          >
            {role.is_enabled ? 'Disable' : 'Enable'}
          </button>
          <button
            onClick={() => setExpanded((p) => !p)}
            className="text-xs text-indigo-600 border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
            <input
              value={form.name}
              onChange={set('name')}
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
            <input
              value={form.description}
              onChange={set('description')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Prompt Context</label>
            <textarea
              value={form.prompt_context}
              onChange={set('prompt_context')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono resize-y focus:ring-2 focus:ring-indigo-500"
              placeholder="Explain concepts slowly. Use examples."
            />
            <p className="text-xs text-gray-400 mt-1">
              Injected into AI context when this role is active.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save size={13} /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="text-sm text-gray-500 dark:text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Roles Tab ────────────────────────────────────────────────────────────────

function RolesTab({
  template,
  onTemplateReload,
}: {
  template: AvatarTemplateDetailResponse;
  onTemplateReload: () => void;
}) {
  const [roles,   setRoles]   = useState<AvatarTemplateRoleResponse[]>(template.roles);
  const [adding,  setAdding]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [newRole, setNewRole] = useState({ name: '', description: '', prompt_context: '' });

  useEffect(() => setRoles(template.roles), [template.roles]);

  const setNew = (f: keyof typeof newRole) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setNewRole((p) => ({ ...p, [f]: e.target.value }));

  const handleAdd = async () => {
    if (!newRole.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError(null);
    try {
      const created = await templateApi.createRole(template.id, {
        name: newRole.name.trim(),
        description: newRole.description.trim() || undefined,
        prompt_context: newRole.prompt_context.trim() || undefined,
      });
      setRoles((p) => [...p, created]);
      setNewRole({ name: '', description: '', prompt_context: '' });
      setAdding(false);
      onTemplateReload();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Create failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Roles are shared across all avatars created from the{' '}
            <Link href={`/admin/avatars/${template.id}`} className="text-indigo-600 hover:underline">
              {template.name}
            </Link>{' '}
            template.
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Role changes take effect immediately for new sessions.
          </p>
        </div>
        <button
          onClick={() => setAdding((p) => !p)}
          className="flex items-center gap-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex-shrink-0"
        >
          <Plus size={14} /> Add Role
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {adding && (
        <div className="bg-gray-50 border border-indigo-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-indigo-900">New Role</p>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              value={newRole.name}
              onChange={setNew('name')}
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Tutor, Exam Coach, Research Assistant…"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
            <input
              value={newRole.description}
              onChange={setNew('description')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Prompt Context</label>
            <textarea
              value={newRole.prompt_context}
              onChange={setNew('prompt_context')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono resize-y focus:ring-2 focus:ring-indigo-500"
              placeholder="Explain concepts slowly. Avoid jargon."
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus size={13} /> {saving ? 'Adding…' : 'Add Role'}
            </button>
            <button
              onClick={() => { setAdding(false); setError(null); }}
              className="text-sm text-gray-500 dark:text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {roles.length === 0 && !adding ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
          <Users size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No roles defined yet.</p>
          <button
            onClick={() => setAdding(true)}
            className="mt-3 text-sm text-indigo-600 hover:underline"
          >
            Add the first role
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {roles.map((r) => (
            <RoleRow
              key={r.id}
              role={r}
              templateId={template.id}
              onUpdated={(u) => setRoles((p) => p.map((x) => (x.id === u.id ? u : x)))}
              onDeleted={(id) => setRoles((p) => p.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type InstanceTab = 'overview' | 'configuration' | 'roles';

export default function AdminAvatarInstancePage() {
  const { id } = useParams<{ id: string }>();

  const [avatar,   setAvatar]   = useState<AvatarResponse | null>(null);
  const [template, setTemplate] = useState<AvatarTemplateDetailResponse | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [tab,      setTab]      = useState<InstanceTab>('overview');

  useEffect(() => {
    setLoading(true);
    adminAvatarApi.get(id)
      .then((av) => {
        setAvatar(av);
        return templateApi.get(av.template_id);
      })
      .then(setTemplate)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  const reloadTemplate = useCallback(() => {
    if (!avatar) return;
    templateApi.get(avatar.template_id).then(setTemplate).catch(() => {});
  }, [avatar]);

  const TABS: { id: InstanceTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',       label: 'Overview',       icon: <BarChart2 size={15} /> },
    { id: 'configuration',  label: 'Configuration',  icon: <Settings size={15} /> },
    { id: 'roles',          label: `Roles${template ? ` (${template.roles.length})` : ''}`, icon: <Users size={15} /> },
  ];

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!avatar) {
    return (
      <div className="text-center py-20 text-red-600">{error || 'Avatar not found'}</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/admin/marketplace"
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 w-fit"
      >
        <ArrowLeft size={16} /> Marketplace
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-5">
          <AvatarIcon imageUrl={avatar.template_image_url} name={avatar.name} size={72} rounded="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{avatar.name}</h1>
              <StatusPill published={avatar.is_published} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{avatar.description || 'No description'}</p>
            {template && (
              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                <Layers size={11} />
                Template:{' '}
                <Link href={`/admin/avatars/${template.id}`} className="text-indigo-500 hover:underline">
                  {template.name}
                </Link>
              </p>
            )}
          </div>
          {template && (
            <Link
              href={`/admin/avatars/${template.id}`}
              className="text-sm text-gray-600 dark:text-gray-400 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors flex-shrink-0"
            >
              View Template
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'overview'      && <OverviewTab avatar={avatar} template={template} />}
      {tab === 'configuration' && <ConfigurationTab avatar={avatar} />}
      {tab === 'roles'         && template && (
        <RolesTab template={template} onTemplateReload={reloadTemplate} />
      )}
      {tab === 'roles' && !template && (
        <div className="text-center py-16 text-gray-400">
          <Users size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Could not load template roles.</p>
        </div>
      )}
    </div>
  );
}
