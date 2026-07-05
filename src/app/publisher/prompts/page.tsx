"use client";

import React, { useEffect, useState } from 'react';
import {
  publisherPromptApi,
  ApiError,
  type PromptTemplateResponse,
  type PromptTemplateCreate,
  type PromptTemplateUpdate,
} from '@/lib/avatarApi';
import { Plus, Pencil, Trash2, Lock, ChevronDown, ChevronUp, X, Check } from 'lucide-react';

const USE_CASE_OPTIONS = [
  'session.teaching',
  'session.examination',
  'session.conversation',
  'grading.assessment',
];

const USE_CASE_LABELS: Record<string, string> = {
  'session.teaching':    'Teaching Session',
  'session.examination': 'Examination Session',
  'session.conversation':'Conversation Session',
  'grading.assessment':  'Grading Assessment',
};

function UseCaseBadge({ value }: { value: string }) {
  return (
    <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
      {USE_CASE_LABELS[value] ?? value}
    </span>
  );
}

function VersionBadge({ v }: { v: number }) {
  return (
    <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-medium">v{v}</span>
  );
}

interface EditorProps {
  initial?: PromptTemplateResponse;
  onSaved: (t: PromptTemplateResponse) => void;
  onCancel: () => void;
}

function TemplateEditor({ initial, onSaved, onCancel }: EditorProps) {
  const [name, setName]        = useState(initial?.name ?? '');
  const [useCase, setUseCase]  = useState(initial?.use_case ?? 'session.teaching');
  const [body, setBody]        = useState(initial?.body ?? '');
  const [description, setDesc] = useState(initial?.description ?? '');
  const [saving, setSaving]    = useState(false);
  const [error, setError]      = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!body.trim()) { setError('Prompt body is required'); return; }
    setSaving(true);
    setError(null);
    try {
      let saved: PromptTemplateResponse;
      if (initial) {
        const update: PromptTemplateUpdate = {
          name: name.trim(),
          description: description.trim() || undefined,
          use_case: useCase,
          body: body.trim(),
        };
        saved = await publisherPromptApi.update(initial.id, update);
      } else {
        const create: PromptTemplateCreate = {
          name: name.trim(),
          use_case: useCase,
          body: body.trim(),
          description: description.trim() || undefined,
        };
        saved = await publisherPromptApi.create(create);
      }
      onSaved(saved);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          {initial ? 'Edit Prompt' : 'New Prompt'}
        </h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Custom Teaching Prompt"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#133221] text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Use Case</label>
          <select
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            disabled={!!initial}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#133221] text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 disabled:opacity-60"
          >
            {USE_CASE_OPTIONS.map((uc) => (
              <option key={uc} value={uc}>{USE_CASE_LABELS[uc]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          value={description}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Short description to identify this prompt"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#133221] text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Prompt Body
          {initial && <span className="text-gray-400 font-normal ml-2">(editing increments version)</span>}
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#133221] text-sm font-mono resize-y dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          placeholder="Write the full system prompt here…"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 border border-gray-300 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-[#133221] text-white py-2 rounded-lg hover:bg-[#0a1e13] disabled:opacity-50 text-sm transition-colors flex items-center justify-center gap-2"
        >
          <Check size={14} />
          {saving ? 'Saving…' : initial ? 'Update Prompt' : 'Create Prompt'}
        </button>
      </div>
    </div>
  );
}

interface RowProps {
  template: PromptTemplateResponse;
  onEdit: (t: PromptTemplateResponse) => void;
  onDeactivate: (id: string) => void;
  deactivating: boolean;
}

function TemplateRow({ template: t, onEdit, onDeactivate, deactivating }: RowProps) {
  const [showBody, setShowBody] = useState(false);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border ${t.is_active ? 'border-gray-200 dark:border-gray-700' : 'border-dashed border-gray-300 opacity-60'} p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t.name}</h3>
            <UseCaseBadge value={t.use_case} />
            <VersionBadge v={t.version} />
            {t.is_system && (
              <span className="flex items-center gap-1 text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-medium">
                <Lock size={10} /> System
              </span>
            )}
          </div>
          {t.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setShowBody((p) => !p)} className="p-1.5 text-gray-400 hover:text-gray-600">
            {showBody ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          {!t.is_system && (
            <>
              <button onClick={() => onEdit(t)} className="p-1.5 text-gray-400 hover:text-blue-600" title="Edit">
                <Pencil size={15} />
              </button>
              {t.is_active && (
                <button
                  onClick={() => { if (confirm(`Delete "${t.name}"?`)) onDeactivate(t.id); }}
                  disabled={deactivating}
                  className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-40"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {showBody && (
        <pre className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
          {t.body}
        </pre>
      )}
    </div>
  );
}

export default function PublisherPromptsPage() {
  const [templates, setTemplates]         = useState<PromptTemplateResponse[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [showCreate, setShowCreate]       = useState(false);
  const [editing, setEditing]             = useState<PromptTemplateResponse | null>(null);
  const [deactivating, setDeactivating]   = useState<string | null>(null);
  const [filterUseCase, setFilterUseCase] = useState('');
  const [tab, setTab]                     = useState<'mine' | 'system'>('mine');

  const load = () => {
    setLoading(true);
    publisherPromptApi.listTemplates(filterUseCase || undefined)
      .then(setTemplates)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterUseCase]);

  const handleSaved = (t: PromptTemplateResponse) => {
    setTemplates((prev) => {
      const idx = prev.findIndex((p) => p.id === t.id);
      if (idx >= 0) return prev.map((p, i) => (i === idx ? t : p));
      return [t, ...prev];
    });
    setShowCreate(false);
    setEditing(null);
  };

  const handleDeactivate = async (id: string) => {
    setDeactivating(id);
    try {
      await publisherPromptApi.deactivate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Delete failed');
    } finally {
      setDeactivating(null);
    }
  };

  const FILTER_OPTIONS = ['', ...USE_CASE_OPTIONS];
  const visible = templates.filter((t) => tab === 'system' ? t.is_system : !t.is_system);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Prompts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create and manage your own prompt templates. System prompts are read-only defaults.
          </p>
        </div>
        {!showCreate && !editing && tab === 'mine' && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-[#133221] text-white px-4 py-2 rounded-lg hover:bg-[#0a1e13] transition-colors text-sm font-medium"
          >
            <Plus size={15} /> New Prompt
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {(['mine', 'system'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setShowCreate(false); setEditing(null); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t === 'mine' ? 'My Prompts' : 'System Defaults'}
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={filterUseCase}
          onChange={(e) => setFilterUseCase(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-[#133221]"
        >
          {FILTER_OPTIONS.map((uc) => (
            <option key={uc} value={uc}>{uc ? USE_CASE_LABELS[uc] : 'All use cases'}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{visible.length} prompt{visible.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Create / Edit form */}
      {showCreate && (
        <TemplateEditor onSaved={handleSaved} onCancel={() => setShowCreate(false)} />
      )}
      {editing && (
        <TemplateEditor initial={editing} onSaved={handleSaved} onCancel={() => setEditing(null)} />
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {tab === 'mine' ? 'No custom prompts yet. Create one above.' : 'No system prompts found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((t) => (
            <TemplateRow
              key={t.id}
              template={t}
              onEdit={setEditing}
              onDeactivate={handleDeactivate}
              deactivating={deactivating === t.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
