"use client";

/**
 * Admin Avatar Management Dashboard
 *
 * A comprehensive management view for a single avatar template, replacing the
 * old path that pushed admins into the publisher workflow.
 *
 * Tabs:
 *   Overview  — stats cards (publishers, courses, sessions, runs)
 *   Publishers — table of publishers who instantiated this template
 *   Courses    — all courses using avatars of this template (read-only)
 *   Sessions   — recent session runs (read-only)
 *   Prompts    — edit conversation + document analysis prompts (versioned)
 *   Roles      — add / edit / disable / delete session roles
 */

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { templateApi, ApiError } from '@/lib/avatarApi';
import type {
  AvatarTemplateDetailResponse,
  AvatarTemplateRoleResponse,
  TemplateDashboardStats,
  TemplatePublisherRow,
  TemplateCourseRow,
  TemplateSessionRunRow,
} from '@/types/avatar';
import AvatarIcon from '@/components/avatars/AvatarIcon';
import {
  ArrowLeft, Save, Send, Users, BookOpen, Activity, Layers,
  Plus, Trash2, GripVertical,
  ChevronDown, ChevronUp, Tag, Camera, RefreshCw,
  BarChart2,
} from 'lucide-react';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatCard({ label, value, icon, color = 'blue' }: {
  label: string; value: number | string; icon: React.ReactNode; color?: string;
}) {
  const colors: Record<string, string> = {
    blue:    'bg-green-50 dark:bg-gray-800 text-[#133221]',
    indigo:  'bg-gray-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber:   'bg-amber-50 text-amber-600',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

function StatusPill({ state }: { state: string }) {
  const map: Record<string, string> = {
    published:   'bg-emerald-100 text-emerald-700',
    draft:       'bg-amber-100 text-amber-700',
    archived:    'bg-gray-100 dark:bg-gray-800 text-gray-400',
    unpublished: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
    active:      'bg-emerald-100 text-emerald-700',
    completed:   'bg-[#BA984E]/20 text-[#133221]',
    failed:      'bg-red-100 text-red-600',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${map[state] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
      {state}
    </span>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ stats }: { stats: TemplateDashboardStats }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Publishers" value={stats.publisher_count} color="blue"
          icon={<Users size={22} />} />
        <StatCard label="Courses"    value={stats.course_count}    color="indigo"
          icon={<BookOpen size={22} />} />
        <StatCard label="Sessions"   value={stats.session_count}   color="emerald"
          icon={<Layers size={22} />} />
        <StatCard label="Session Runs" value={stats.session_run_count} color="amber"
          icon={<Activity size={22} />} />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Template details</p>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div><dt className="text-gray-400">Published state</dt><dd className="font-medium text-gray-800 dark:text-gray-200 capitalize">{stats.published_state}</dd></div>
          <div><dt className="text-gray-400">Versions</dt><dd className="font-medium text-gray-800 dark:text-gray-200">{stats.version_count}</dd></div>
        </dl>
      </div>
    </div>
  );
}

// ─── Publishers Tab ───────────────────────────────────────────────────────────

function PublishersTab({ rows, loading }: { rows: TemplatePublisherRow[]; loading: boolean }) {
  if (loading) return <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />;
  if (rows.length === 0) return (
    <div className="text-center py-12 text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
      No publishers yet.
    </div>
  );
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Publisher</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Avatar</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((r) => (
            <tr key={r.avatar_id} className="hover:bg-gray-50 dark:bg-gray-900">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900 dark:text-gray-100">{r.username}</p>
                <p className="text-xs text-gray-400">{r.email}</p>
              </td>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.avatar_name}</td>
              <td className="px-4 py-3">
                <StatusPill state={r.is_published ? 'published' : 'draft'} />
              </td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Courses Tab ──────────────────────────────────────────────────────────────

function CoursesTab({ rows, loading }: { rows: TemplateCourseRow[]; loading: boolean }) {
  if (loading) return <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />;
  if (rows.length === 0) return (
    <div className="text-center py-12 text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
      No courses yet.
    </div>
  );
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Course</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Publisher</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Sessions</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((r) => (
            <tr key={r.course_id} className="hover:bg-gray-50 dark:bg-gray-900">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900 dark:text-gray-100">{r.name || r.course_id}</p>
                {r.code && <p className="text-xs text-gray-400">{r.code}</p>}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.publisher_username}</td>
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{r.session_count}</td>
              <td className="px-4 py-3">
                <StatusPill state={r.is_active ? 'active' : 'archived'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Sessions Tab ─────────────────────────────────────────────────────────────

function SessionsTab({ rows, loading }: { rows: TemplateSessionRunRow[]; loading: boolean }) {
  if (loading) return <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />;
  if (rows.length === 0) return (
    <div className="text-center py-12 text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
      No session runs yet.
    </div>
  );
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Session</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Publisher</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Role</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Started</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((r) => (
            <tr key={r.run_id} className="hover:bg-gray-50 dark:bg-gray-900">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900 dark:text-gray-100 text-xs">{r.session_name || r.session_id}</p>
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.publisher_username}</td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{r.role_at_start || '—'}</td>
              <td className="px-4 py-3"><StatusPill state={r.status} /></td>
              <td className="px-4 py-3 text-gray-400 text-xs">{new Date(r.start_time).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Prompts Tab ──────────────────────────────────────────────────────────────

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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:bg-gray-900 rounded-xl transition-colors"
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 dark:text-gray-100">{title}</p>
            {badge && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
        {open
          ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
          : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800">
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

  useEffect(() => {
    const latestDraft = template.versions.find((v) => v.status === 'draft');
    if (latestDraft && !current) {
      setExamPrompt(latestDraft.examination_prompt ?? '');
      setTeachPrompt(latestDraft.teaching_prompt ?? '');
      setDocPrompt(latestDraft.document_analysis_prompt ?? '');
      setDraftId(latestDraft.id);
    }
  }, [template.versions, current]);

  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(null), 4000); };

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
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const handlePublish = async () => {
    if (!draftId) { setError('Save a draft first'); return; }
    if (!confirm('Publish this version?')) return;
    setPublishing(true); setError(null);
    try {
      await templateApi.publishVersion(template.id, draftId);
      setDraftId(null);
      flash('Published successfully');
      onReload();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Publish failed'); }
    finally { setPublishing(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Published version: {current ? `v${current.version_number}` : 'None'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {current
              ? `Published ${fmt(current.published_at!)}`
              : 'No version published yet.'}
          </p>
        </div>
        <StatusPill state={template.published_state} />
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
        placeholder="You are an expert AI examiner. Your role is to assess the student's understanding by asking targeted questions, challenging their reasoning, and identifying knowledge gaps..."
      />

      {/* Teaching Prompt */}
      <PromptBlock
        title="Teaching Prompt"
        description="Used when a session is started in Teaching Mode. The avatar explains concepts, provides examples, breaks down difficult ideas, and scaffolds learning toward understanding."
        badge="Teaching Mode"
        badgeColor="bg-[#BA984E]/20 text-[#133221]"
        value={teachPrompt}
        onChange={setTeachPrompt}
        rows={12}
        placeholder="You are an expert AI tutor. Your role is to help the student understand difficult concepts by explaining them clearly, providing relevant examples, and scaffolding their learning..."
      />

      {/* Document Analysis Prompt */}
      <PromptBlock
        title="Document Analysis Prompt"
        description="Used when analyzing uploaded PDFs, rubrics, slides, or notes. Extracts key concepts, learning objectives, and instructional content from documents."
        value={docPrompt}
        onChange={setDocPrompt}
        rows={6}
        placeholder="Analyze the following document and extract key concepts, learning objectives, and assessment criteria..."
      />

      {/* Change notes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Change Notes <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="What changed in this version?"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSaveDraft} disabled={saving}
          className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-lg hover:bg-gray-50 dark:bg-gray-900 disabled:opacity-50 transition-colors font-medium text-sm">
          <Save size={15} /> {saving ? 'Saving…' : 'Save Draft'}
        </button>
        <button onClick={handlePublish} disabled={publishing || !draftId}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium text-sm">
          <Send size={15} /> {publishing ? 'Publishing…' : 'Publish'}
        </button>
        {!draftId && <p className="text-xs text-gray-400">Save a draft first.</p>}
      </div>
    </div>
  );
}

// ─── Roles Tab ────────────────────────────────────────────────────────────────

function RoleRow({ role, templateId, onUpdated, onDeleted }: {
  role: AvatarTemplateRoleResponse;
  templateId: string;
  onUpdated: (r: AvatarTemplateRoleResponse) => void;
  onDeleted: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm]         = useState({ name: role.name, description: role.description ?? '', prompt_context: role.prompt_context ?? '' });
  const [saving, setSaving]     = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError]       = useState<string | null>(null);

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
      onUpdated(updated); setExpanded(false);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const updated = await templateApi.updateRole(templateId, role.id, { is_enabled: !role.is_enabled });
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
    <div className={`border rounded-xl ${role.is_enabled ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800' : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900'}`}>
      <div className="flex items-center gap-3 p-4">
        <GripVertical size={16} className="text-gray-300 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-medium text-sm ${role.is_enabled ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>{role.name}</p>
            {!role.is_enabled && <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">Disabled</span>}
          </div>
          {role.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{role.description}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={handleToggle} disabled={toggling}
            className="text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors disabled:opacity-40">
            {role.is_enabled ? 'Disable' : 'Enable'}
          </button>
          <button onClick={() => setExpanded((p) => !p)}
            className="text-xs text-indigo-600 border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors">
            Edit
          </button>
          <button onClick={handleDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
          {error && <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
            <input value={form.name} onChange={set('name')} maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
            <input value={form.description} onChange={set('description')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Prompt Context</label>
            <textarea value={form.prompt_context} onChange={set('prompt_context')} rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono resize-y focus:ring-2 focus:ring-indigo-500"
              placeholder="Explain concepts slowly. Use examples." />
            <p className="text-xs text-gray-400 mt-1">Injected into AI context when this role is active.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              <Save size={13} /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setExpanded(false)}
              className="text-sm text-gray-500 dark:text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
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
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Create failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Role changes take effect immediately for new sessions — no republish required.
        </p>
        <button onClick={() => setAdding((p) => !p)}
          className="flex items-center gap-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex-shrink-0">
          <Plus size={14} /> Add Role
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {adding && (
        <div className="bg-gray-50 border border-indigo-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-indigo-900">New Role</p>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name <span className="text-red-500">*</span></label>
            <input value={newRole.name} onChange={setNew('name')} maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Beginner Student, Medical Resident…" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
            <input value={newRole.description} onChange={setNew('description')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Prompt Context</label>
            <textarea value={newRole.prompt_context} onChange={setNew('prompt_context')} rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono resize-y focus:ring-2 focus:ring-indigo-500"
              placeholder="Explain concepts slowly. Avoid jargon." />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving}
              className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              <Plus size={13} /> {saving ? 'Adding…' : 'Add Role'}
            </button>
            <button onClick={() => { setAdding(false); setError(null); }}
              className="text-sm text-gray-500 dark:text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {roles.length === 0 && !adding ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
          <Users size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No roles defined yet.</p>
          <button onClick={() => setAdding(true)} className="mt-3 text-sm text-indigo-600 hover:underline">Add the first role</button>
        </div>
      ) : (
        <div className="space-y-2">
          {roles.map((r) => (
            <RoleRow key={r.id} role={r} templateId={template.id}
              onUpdated={(u) => setRoles((p) => p.map((x) => x.id === u.id ? u : x))}
              onDeleted={(id) => setRoles((p) => p.filter((x) => x.id !== id))} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type DashTab = 'overview' | 'publishers' | 'courses' | 'sessions' | 'prompts' | 'roles';

export default function AdminAvatarDashboardPage() {
  const { id } = useParams<{ id: string }>();

  const [template,    setTemplate]    = useState<AvatarTemplateDetailResponse | null>(null);
  const [stats,       setStats]       = useState<TemplateDashboardStats | null>(null);
  const [publishers,  setPublishers]  = useState<TemplatePublisherRow[]>([]);
  const [courses,     setCourses]     = useState<TemplateCourseRow[]>([]);
  const [sessionRuns, setSessionRuns] = useState<TemplateSessionRunRow[]>([]);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [loadingStats,    setLoadingStats]    = useState(true);
  const [loadingPub,      setLoadingPub]      = useState(false);
  const [loadingCourses,  setLoadingCourses]  = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab,   setTab]   = useState<DashTab>('overview');
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null);

  const loadTemplate = useCallback(() => {
    setLoadingTemplate(true);
    templateApi.get(id)
      .then((t) => {
        setTemplate(t);
        setAvatarImageUrl(t.avatar_image_url ?? null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load'))
      .finally(() => setLoadingTemplate(false));
  }, [id]);

  useEffect(() => {
    loadTemplate();
    templateApi.getStats(id)
      .then(setStats)
      .catch(() => {/* non-fatal */})
      .finally(() => setLoadingStats(false));
  }, [id, loadTemplate]);

  // Lazy-load operational data when switching to those tabs
  useEffect(() => {
    if (tab === 'publishers' && publishers.length === 0) {
      setLoadingPub(true);
      templateApi.getPublishers(id).then(setPublishers).catch(() => {}).finally(() => setLoadingPub(false));
    }
    if (tab === 'courses' && courses.length === 0) {
      setLoadingCourses(true);
      templateApi.getCourses(id).then(setCourses).catch(() => {}).finally(() => setLoadingCourses(false));
    }
    if (tab === 'sessions' && sessionRuns.length === 0) {
      setLoadingSessions(true);
      templateApi.getSessions(id).then(setSessionRuns).catch(() => {}).finally(() => setLoadingSessions(false));
    }
  }, [tab, id]);

  const TABS: { id: DashTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',    label: 'Overview',    icon: <BarChart2 size={15} /> },
    { id: 'publishers',  label: 'Publishers',  icon: <Users size={15} /> },
    { id: 'courses',     label: 'Courses',     icon: <BookOpen size={15} /> },
    { id: 'sessions',    label: 'Sessions',    icon: <Activity size={15} /> },
    { id: 'prompts',     label: 'Prompts',     icon: <Layers size={15} /> },
    { id: 'roles',       label: `Roles${template ? ` (${template.roles.length})` : ''}`, icon: <Users size={15} /> },
  ];

  if (loadingTemplate) return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
    </div>
  );
  if (!template) return (
    <div className="text-center py-20 text-red-600">{error || 'Template not found'}</div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/admin/templates" className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 w-fit">
        <ArrowLeft size={16} /> Avatar Templates
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-5">
          {/* Image with hover-to-upload */}
          <div className="relative group flex-shrink-0">
            <AvatarIcon imageUrl={avatarImageUrl} name={template.name} size={72} rounded="lg" />
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg cursor-pointer">
              <Camera size={20} className="text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const fd = new FormData();
                fd.append('file', file);
                try {
                  const res = await templateApi.uploadImage(id, fd);
                  setAvatarImageUrl(res.avatar_image_url);
                } catch { /* ignore */ }
                e.target.value = '';
              }} />
            </label>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{template.name}</h1>
              {template.category && (
                <span className="flex items-center gap-1 text-xs text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full">
                  <Tag size={11} /> {template.category}
                </span>
              )}
              <StatusPill state={template.published_state} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{template.description || 'No description'}</p>
            {!loadingStats && stats && (
              <p className="text-xs text-gray-400 mt-1.5">
                {stats.publisher_count} publisher{stats.publisher_count !== 1 ? 's' : ''} ·{' '}
                {stats.course_count} course{stats.course_count !== 1 ? 's' : ''} ·{' '}
                {stats.session_run_count} run{stats.session_run_count !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <Link href={`/admin/templates/${id}`}
              className="text-sm text-gray-600 dark:text-gray-400 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors">
              Advanced edit
            </Link>
            <button onClick={loadTemplate}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'overview'   && (loadingStats ? <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" /> : stats ? <OverviewTab stats={stats} /> : null)}
      {tab === 'publishers' && <PublishersTab rows={publishers} loading={loadingPub} />}
      {tab === 'courses'    && <CoursesTab rows={courses} loading={loadingCourses} />}
      {tab === 'sessions'   && <SessionsTab rows={sessionRuns} loading={loadingSessions} />}
      {tab === 'prompts'    && <PromptsTab template={template} onReload={loadTemplate} />}
      {tab === 'roles'      && <RolesTab template={template} onReload={loadTemplate} />}
    </div>
  );
}
