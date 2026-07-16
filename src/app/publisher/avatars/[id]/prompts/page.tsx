"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  publisherPromptApi,
  ApiError,
  type AvatarPromptConfigResponse,
  type PromptTemplateResponse,
  type AvatarPromptConfigUpsert,
} from '@/lib/avatarApi';
import { ArrowLeft, FileText, ChevronDown, ChevronUp, Trash2, Check, X } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const USE_CASES = [
  { key: 'session.teaching',    label: 'Teaching Session',      description: 'Used when a session is in teaching mode.' },
  { key: 'session.examination', label: 'Examination Session',   description: 'Used when a session is in examination mode.' },
  { key: 'session.conversation',label: 'Conversation Session',  description: 'Used for free-form consultation sessions.' },
  { key: 'grading.assessment',  label: 'Grading Assessment',    description: 'Used as the grading instruction prompt for autograder submissions.' },
];

// ─── Per-use-case config card ──────────────────────────────────────────────────

interface ConfigCardProps {
  useCase: typeof USE_CASES[0];
  config: AvatarPromptConfigResponse | undefined;
  templates: PromptTemplateResponse[];
  avatarId: string;
  onSaved: (cfg: AvatarPromptConfigResponse) => void;
  onDeleted: (useCase: string) => void;
}

function ConfigCard({ useCase, config, templates, avatarId, onSaved, onDeleted }: ConfigCardProps) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [isEnabled, setIsEnabled] = useState<boolean>(config?.is_enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve the effective text: publisher override → linked template body → system default body
  const resolveBody = () => {
    if (config?.override_body) return config.override_body;
    if (config?.prompt_template_id) {
      const linked = templates.find((t) => t.id === config.prompt_template_id);
      if (linked) return linked.body;
    }
    return templates.find((t) => t.use_case === useCase.key && t.is_system)?.body ?? '';
  };

  // Pre-populate textarea whenever the card opens or its data changes
  useEffect(() => {
    if (open) setBody(resolveBody());
  }, [open, config, templates]);

  useEffect(() => {
    setIsEnabled(config?.is_enabled ?? true);
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await publisherPromptApi.upsertConfig(avatarId, useCase.key, {
        prompt_template_id: null,
        is_enabled: isEnabled,
        override_body: body.trim() || null,
        override_name: null,
        is_custom: true,
      } satisfies AvatarPromptConfigUpsert);
      onSaved(saved);
      setOpen(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!config) return;
    if (!confirm('Reset to system default? Your custom prompt will be removed.')) return;
    setDeleting(true);
    setError(null);
    try {
      await publisherPromptApi.deleteConfig(avatarId, useCase.key);
      onDeleted(useCase.key);
      setOpen(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const isCustomized = !!config?.override_body;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Card header */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <FileText size={18} className="text-gray-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{useCase.label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{useCase.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {isCustomized ? (
            <span className="text-xs text-[#133221] bg-[#133221]/10 px-2 py-0.5 rounded-full font-medium">Customized</span>
          ) : (
            <span className="text-xs text-gray-400 px-2 py-0.5 rounded-full border border-dashed border-gray-300">System default</span>
          )}
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {/* Expanded editor */}
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {/* Enable toggle */}
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="rounded border-gray-300 text-[#133221] focus:ring-[#133221]"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Enable prompt for this use case</span>
          </label>

          {/* Editable prompt text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prompt text
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Pre-filled with the current effective prompt. Edit freely — changes apply to this avatar only and do not affect other avatars or the system default.
            </p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#133221] focus:border-[#133221] text-sm font-mono resize-y dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-[#133221] text-white px-4 py-2 rounded-lg hover:bg-[#0a1e13] disabled:opacity-50 text-sm font-medium transition-colors"
              >
                <Check size={14} />
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 border border-gray-300 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
              >
                <X size={14} /> Cancel
              </button>
            </div>
            {config && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
              >
                <Trash2 size={14} /> {deleting ? 'Resetting…' : 'Reset to system default'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AvatarPromptsPage() {
  const { id } = useParams<{ id: string }>();
  const [configs, setConfigs]     = useState<AvatarPromptConfigResponse[]>([]);
  const [templates, setTemplates] = useState<PromptTemplateResponse[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      publisherPromptApi.listConfigs(id),
      publisherPromptApi.listTemplates(),
    ])
      .then(([cfgs, tmps]) => { setConfigs(cfgs); setTemplates(tmps); })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load prompt data'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaved = (updated: AvatarPromptConfigResponse) => {
    setConfigs((prev) => {
      const idx = prev.findIndex((c) => c.use_case === updated.use_case);
      if (idx >= 0) return prev.map((c, i) => (i === idx ? updated : c));
      return [...prev, updated];
    });
  };

  const handleDeleted = (useCase: string) => {
    setConfigs((prev) => prev.filter((c) => c.use_case !== useCase));
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href={`/publisher/avatars/${id}`}
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 w-fit"
      >
        <ArrowLeft size={16} /> Back to Avatar
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Prompts</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure the AI instruction prompts for each session type. Leave a card on "System default" to use the platform-wide prompt.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="space-y-3">
        {USE_CASES.map((uc) => (
          <ConfigCard
            key={uc.key}
            useCase={uc}
            config={configs.find((c) => c.use_case === uc.key)}
            templates={templates}
            avatarId={id}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        ))}
      </div>
    </div>
  );
}
