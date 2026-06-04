"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { templateApi, ApiError } from '@/lib/avatarApi';
import type {
  AvatarTemplateDetailResponse,
  AvatarTemplateRoleResponse,
  AvatarTemplateVersionResponse,
} from '@/types/avatar';
import {
  ArrowLeft, Save, Send, Clock, CheckCircle, XCircle, Plus,
  Trash2, GripVertical, Eye, EyeOff, ChevronDown, ChevronUp,
  Tag, Layers, Users, Camera, X as XIcon,
} from 'lucide-react';
import AvatarIcon from '@/components/avatars/AvatarIcon';

// ─── helpers ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: 'bg-emerald-100 text-emerald-700',
    draft:     'bg-amber-100 text-amber-700',
    archived:  'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── sub-components ─────────────────────────────────────────────────────────

// ── reusable collapsible prompt block ────────────────────────────────────────

function PromptBlock({
  title,
  description,
  badge,
  badgeColor,
  value,
  onChange,
  rows,
  placeholder,
}: {
  title: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
  placeholder: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-900">{title}</p>
          {badge && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor ?? 'bg-gray-100 text-gray-600'}`}>
              {badge}
            </span>
          )}
          <p className="text-xs text-gray-500 mt-0.5 w-full">{description}</p>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            placeholder={placeholder}
            className="w-full mt-4 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm font-mono resize-y"
          />
        </div>
      )}
    </div>
  );
}

// Prompt Editor Tab
function PromptsTab({ template, onReload }: {
  template: AvatarTemplateDetailResponse;
  onReload: () => void;
}) {
  const current = template.current_version;
  const [examPrompt,  setExamPrompt]  = useState(current?.examination_prompt ?? '');
  const [teachPrompt, setTeachPrompt] = useState(current?.teaching_prompt ?? '');
  const [docPrompt,   setDocPrompt]   = useState(current?.document_analysis_prompt ?? '');
  const [notes,       setNotes]       = useState('');
  const [saving,      setSaving]      = useState(false);
  const [publishing,  setPublishing]  = useState(false);
  const [draftId,     setDraftId]     = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [success,     setSuccess]     = useState<string | null>(null);

  // Pre-fill from most recent draft when no published version exists
  useEffect(() => {
    const latestDraft = template.versions.find((v) => v.status === 'draft');
    if (latestDraft && !current) {
      setExamPrompt(latestDraft.examination_prompt ?? '');
      setTeachPrompt(latestDraft.teaching_prompt ?? '');
      setDocPrompt(latestDraft.document_analysis_prompt ?? '');
      setDraftId(latestDraft.id);
    }
  }, [template.versions, current]);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  const handleSaveDraft = async () => {
    setSaving(true); setError(null);
    try {
      const v = await templateApi.saveDraft(template.id, {
        examination_prompt:       examPrompt  || undefined,
        teaching_prompt:          teachPrompt || undefined,
        document_analysis_prompt: docPrompt   || undefined,
        change_notes:             notes       || undefined,
      });
      setDraftId(v.id);
      flash(`Draft v${v.version_number} saved`);
      onReload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!draftId) {
      setError('Save a draft first before publishing');
      return;
    }
    if (!confirm('Publish this version? New publisher avatars will inherit these prompts. Existing avatars are unaffected.')) return;
    setPublishing(true); setError(null);
    try {
      await templateApi.publishVersion(template.id, draftId);
      setDraftId(null);
      flash('Version published successfully');
      onReload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Published state banner */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div>
          <p className="text-sm font-medium text-gray-700">
            Published version: {current ? `v${current.version_number}` : 'None'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {current
              ? `Published ${fmt(current.published_at!)}`
              : 'No version published yet. Save a draft and publish it.'}
          </p>
        </div>
        <StatusBadge status={template.published_state} />
      </div>

      {error   && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      {success && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">{success}</div>}

      {/* Examination Prompt */}
      <PromptBlock
        title="Examination Prompt"
        description="Used when a session is started in Examination Mode. The avatar assesses understanding, asks questions, tests knowledge, challenges reasoning, and evaluates mastery."
        badge="Examination Mode"
        badgeColor="bg-amber-100 text-amber-700"
        value={examPrompt}
        onChange={setExamPrompt}
        rows={12}
        placeholder="You are an expert AI examiner. Your role is to assess the student's understanding by asking targeted questions, challenging their reasoning, and identifying knowledge gaps. Do not explain concepts unprompted — instead, probe the student's existing knowledge..."
      />

      {/* Teaching Prompt */}
      <PromptBlock
        title="Teaching Prompt"
        description="Used when a session is started in Teaching Mode. The avatar explains concepts, provides examples, breaks down difficult ideas, and scaffolds learning toward understanding."
        badge="Teaching Mode"
        badgeColor="bg-blue-100 text-blue-700"
        value={teachPrompt}
        onChange={setTeachPrompt}
        rows={12}
        placeholder="You are an expert AI tutor. Your role is to help the student understand difficult concepts by explaining them clearly, providing relevant examples, and scaffolding their learning. Adapt your explanations to the student's level..."
      />

      {/* Document Analysis Prompt */}
      <PromptBlock
        title="Document Analysis Prompt"
        description="Used when publishers upload PDFs, rubrics, slides, or notes for analysis. Extracts key concepts, learning objectives, and instructional content from documents."
        value={docPrompt}
        onChange={setDocPrompt}
        rows={6}
        placeholder="Analyze the following document and extract key concepts, learning objectives, and assessment criteria..."
      />

      {/* Change notes */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Change Notes <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What changed in this version?"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSaveDraft}
          disabled={saving}
          className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium text-sm"
        >
          <Save size={15} /> {saving ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          onClick={handlePublish}
          disabled={publishing || !draftId}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium text-sm"
        >
          <Send size={15} /> {publishing ? 'Publishing...' : 'Publish'}
        </button>
        {!draftId && (
          <p className="text-xs text-gray-400">Save a draft first to enable publishing.</p>
        )}
      </div>
    </div>
  );
}

// Role Editor Tab
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
  const [expanded, setExpanded]     = useState(false);
  const [form, setForm]             = useState({ name: role.name, description: role.description ?? '', prompt_context: role.prompt_context ?? '' });
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [toggling, setToggling]     = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const set = (f: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
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
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const updated = await templateApi.updateRole(templateId, role.id, { is_enabled: !role.is_enabled });
      onUpdated(updated);
    } catch { /* ignore */ } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    setDeleting(true);
    try {
      await templateApi.deleteRole(templateId, role.id);
      onDeleted(role.id);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Delete failed');
      setDeleting(false);
    }
  };

  return (
    <div className={`border rounded-xl ${role.is_enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex items-center gap-3 p-4">
        <GripVertical size={16} className="text-gray-300 cursor-grab flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-medium text-sm ${role.is_enabled ? 'text-gray-900' : 'text-gray-400'}`}>{role.name}</p>
            {!role.is_enabled && <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">Disabled</span>}
          </div>
          {role.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{role.description}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={handleToggle} disabled={toggling}
            className="text-xs text-gray-500 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40">
            {role.is_enabled ? 'Disable' : 'Enable'}
          </button>
          <button onClick={() => setExpanded((p) => !p)}
            className="text-xs text-indigo-600 border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors">
            Edit
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-3">
          {error && <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input value={form.name} onChange={set('name')} maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input value={form.description} onChange={set('description')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              placeholder="Brief description of this role" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Prompt Context</label>
            <textarea value={form.prompt_context} onChange={set('prompt_context')} rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono resize-y focus:ring-2 focus:ring-indigo-500"
              placeholder="Explain concepts slowly. Avoid jargon. Use examples." />
            <p className="text-xs text-gray-400 mt-1">Injected into the AI context when this role is selected.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              <Save size={13} /> {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setExpanded(false)}
              className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RolesTab({ template, onReload }: {
  template: AvatarTemplateDetailResponse;
  onReload: () => void;
}) {
  const [roles, setRoles]   = useState<AvatarTemplateRoleResponse[]>(template.roles);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [newRole, setNewRole] = useState({ name: '', description: '', prompt_context: '' });

  useEffect(() => setRoles(template.roles), [template.roles]);

  const setNew = (f: keyof typeof newRole) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
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
      onReload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdated = (updated: AvatarTemplateRoleResponse) =>
    setRoles((p) => p.map((r) => r.id === updated.id ? updated : r));

  const handleDeleted = (id: string) =>
    setRoles((p) => p.filter((r) => r.id !== id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">
            Define which roles are available for this template. Publishers and subscribers will be able to select from these roles when creating sessions.
          </p>
          <p className="text-xs text-gray-400 mt-1">Role selection for publishers and subscribers is not yet active — this prepares the configuration.</p>
        </div>
        <button onClick={() => setAdding((p) => !p)}
          className="flex items-center gap-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex-shrink-0">
          <Plus size={14} /> Add Role
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {adding && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-indigo-900">New Role</p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name <span className="text-red-500">*</span></label>
            <input value={newRole.name} onChange={setNew('name')} maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Beginner Student, Medical Resident..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input value={newRole.description} onChange={setNew('description')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              placeholder="Who is this role for?" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Prompt Context</label>
            <textarea value={newRole.prompt_context} onChange={setNew('prompt_context')} rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono resize-y focus:ring-2 focus:ring-indigo-500"
              placeholder="Explain concepts slowly. Avoid jargon. Use examples." />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving}
              className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              <Plus size={13} /> {saving ? 'Adding...' : 'Add Role'}
            </button>
            <button onClick={() => { setAdding(false); setError(null); }}
              className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-50 border border-gray-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {roles.length === 0 && !adding ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Users size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No roles defined yet.</p>
          <button onClick={() => setAdding(true)}
            className="mt-3 text-sm text-indigo-600 hover:underline">Add the first role</button>
        </div>
      ) : (
        <div className="space-y-2">
          {roles.map((r) => (
            <RoleRow
              key={r.id}
              role={r}
              templateId={template.id}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Version History Tab
function VersionHistoryTab({ template, onReload }: {
  template: AvatarTemplateDetailResponse;
  onReload: () => void;
}) {
  const [publishing, setPublishing] = useState<string | null>(null);
  const [versions, setVersions]     = useState(template.versions);
  const [expanded, setExpanded]     = useState<string | null>(null);

  useEffect(() => setVersions(template.versions), [template.versions]);

  const handlePublish = async (v: AvatarTemplateVersionResponse) => {
    if (!confirm(`Publish v${v.version_number}? This will replace the current published version.`)) return;
    setPublishing(v.id);
    try {
      await templateApi.publishVersion(template.id, v.id);
      onReload();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Publish failed');
    } finally {
      setPublishing(null);
    }
  };

  if (versions.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <Clock size={32} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No versions yet. Save a draft to start the version history.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {versions.map((v) => (
        <div key={v.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-gray-600">v{v.version_number}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <StatusBadge status={v.status} />
                {v.change_notes && <p className="text-sm text-gray-700 truncate">{v.change_notes}</p>}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Created {fmt(v.created_at)}
                {v.published_at && ` · Published ${fmt(v.published_at)}`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setExpanded((p) => p === v.id ? null : v.id)}
                className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50">
                {expanded === v.id ? <EyeOff size={12} /> : <Eye size={12} />} Prompts
              </button>
              {v.status === 'draft' && (
                <button
                  onClick={() => handlePublish(v)}
                  disabled={publishing === v.id}
                  className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  <Send size={11} /> {publishing === v.id ? '…' : 'Publish'}
                </button>
              )}
            </div>
          </div>
          {expanded === v.id && (
            <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Examination Prompt
                </p>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white rounded-lg border border-gray-200 p-3 max-h-48 overflow-y-auto">
                  {v.examination_prompt || <span className="text-gray-400">(empty)</span>}
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Teaching Prompt
                </p>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white rounded-lg border border-gray-200 p-3 max-h-48 overflow-y-auto">
                  {v.teaching_prompt || <span className="text-gray-400">(empty)</span>}
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Document Analysis Prompt
                </p>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white rounded-lg border border-gray-200 p-3 max-h-48 overflow-y-auto">
                  {v.document_analysis_prompt || <span className="text-gray-400">(empty)</span>}
                </pre>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Avatar Image Uploader ───────────────────────────────────────────────────

function AvatarImageUploader({
  templateId,
  imageUrl,
  onChanged,
}: {
  templateId: string;
  imageUrl: string | null | undefined;
  onChanged: (url: string | null) => void;
}) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing,  setRemoving]  = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await templateApi.uploadImage(templateId, fd);
      onChanged(res.avatar_image_url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!confirm('Remove avatar image?')) return;
    setRemoving(true); setError(null);
    try {
      await templateApi.deleteImage(templateId);
      onChanged(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Remove failed');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative group">
        <AvatarIcon imageUrl={imageUrl} name="" size={64} rounded="lg" />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          title="Upload image"
          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg cursor-pointer disabled:cursor-wait">
          <Camera size={18} className="text-white" />
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <div className="flex flex-col gap-1">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-indigo-600 hover:underline disabled:opacity-40 text-left">
          {uploading ? 'Uploading…' : imageUrl ? 'Replace image' : 'Upload image'}
        </button>
        {imageUrl && (
          <button
            onClick={handleRemove}
            disabled={removing}
            className="text-xs text-red-500 hover:underline disabled:opacity-40 text-left">
            {removing ? 'Removing…' : 'Remove'}
          </button>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type Tab = 'prompts' | 'roles' | 'history';

export default function EditTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const [template, setTemplate]       = useState<AvatarTemplateDetailResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [tab, setTab]                 = useState<Tab>('prompts');
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null);

  // Metadata edit
  const [editMeta, setEditMeta]     = useState(false);
  const [metaForm, setMetaForm]     = useState({ name: '', description: '', category: '' });
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaError, setMetaError]   = useState<string | null>(null);

  const load = useCallback(() => {
    templateApi.get(id)
      .then((t) => {
        setTemplate(t);
        setMetaForm({ name: t.name, description: t.description ?? '', category: t.category ?? '' });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  // Sync avatarImageUrl when template loads/reloads
  useEffect(() => {
    if (template) setAvatarImageUrl(template.avatar_image_url ?? null);
  }, [template]);

  const setMeta = (f: keyof typeof metaForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setMetaForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSaveMeta = async () => {
    setSavingMeta(true); setMetaError(null);
    try {
      await templateApi.update(id, {
        name: metaForm.name.trim(),
        description: metaForm.description.trim() || undefined,
        category: metaForm.category.trim() || undefined,
      });
      setEditMeta(false);
      load();
    } catch (e) {
      setMetaError(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setSavingMeta(false);
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
      <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
      <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
    </div>
  );

  if (!template) return (
    <div className="text-center py-20 text-red-600">{error || 'Template not found'}</div>
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'prompts', label: 'Prompt Management', icon: <Layers size={15} /> },
    { id: 'roles',   label: `Roles (${template.roles.length})`, icon: <Users size={15} /> },
    { id: 'history', label: `Version History (${template.version_count})`, icon: <Clock size={15} /> },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <Link href="/admin/templates" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 w-fit">
        <ArrowLeft size={16} /> Templates
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {!editMeta ? (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              {/* Avatar image with inline uploader */}
              <AvatarImageUploader
                templateId={id}
                imageUrl={avatarImageUrl}
                onChanged={setAvatarImageUrl}
              />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
                {template.category && (
                  <span className="flex items-center gap-1 text-xs text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full">
                    <Tag size={11} /> {template.category}
                  </span>
                )}
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${template.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {template.is_active ? 'Active' : 'Archived'}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">{template.description || 'No description'}</p>
              <p className="text-xs text-gray-400 mt-1">
                {template.version_count} version{template.version_count !== 1 ? 's' : ''}
                {' · '}
                {template.roles.length} role{template.roles.length !== 1 ? 's' : ''}
                {' · '}
                Published state: <span className="font-medium">{template.published_state}</span>
              </p>
            </div>
            </div>
            <button onClick={() => setEditMeta(true)}
              className="text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0">
              Edit Info
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900">Edit Template Info</h2>
            {metaError && <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{metaError}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input value={metaForm.name} onChange={setMeta('name')} maxLength={200}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <input value={metaForm.category} onChange={setMeta('category')} maxLength={100}
                  placeholder="e.g., Education, Medical, Legal..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea value={metaForm.description} onChange={setMeta('description')} rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveMeta} disabled={savingMeta}
                className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                <Save size={13} /> {savingMeta ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setEditMeta(false); setMetaError(null); }}
                className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-50 border border-gray-200">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'prompts' && <PromptsTab template={template} onReload={load} />}
      {tab === 'roles'   && <RolesTab   template={template} onReload={load} />}
      {tab === 'history' && <VersionHistoryTab template={template} onReload={load} />}
    </div>
  );
}
