"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { publisherTemplateApi, avatarApi, ApiError } from '@/lib/avatarApi';
import type { AvatarTemplateSummary, TeachingPreferences } from '@/types/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, ArrowRight, CheckCircle, Layers, Tag } from 'lucide-react';
import AvatarIcon from '@/components/avatars/AvatarIcon';

// ─── step types ──────────────────────────────────────────────────────────────

type Step = 'template' | 'info' | 'preferences';

// ─── preference option helpers ───────────────────────────────────────────────

interface PrefOption { value: string; label: string; description: string }

function PrefGroup({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: PrefOption[];
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      <div className="grid sm:grid-cols-3 gap-2">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                selected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <p className={`text-xs font-semibold ${selected ? 'text-blue-700' : 'text-gray-800'}`}>
                {opt.label}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── preference option definitions ───────────────────────────────────────────

const PACE_OPTIONS: PrefOption[] = [
  { value: 'thorough',  label: 'Thorough & Detailed',  description: 'Break ideas into smaller steps; ensure understanding before moving on.' },
  { value: 'balanced',  label: 'Balanced',              description: 'Sufficient explanation while keeping the session focused and efficient.' },
  { value: 'fast',      label: 'Fast & Concise',        description: 'Hit the most important points; avoid unnecessary detail.' },
];

const QUESTIONING_OPTIONS: PrefOption[] = [
  { value: 'socratic', label: 'Socratic',         description: 'Teach through questions; let students reason toward answers.' },
  { value: 'direct',   label: 'Direct',            description: 'Explain first, then check understanding with follow-ups.' },
  { value: 'guided',   label: 'Guided Discovery',  description: 'Hints and progressive prompts lead students to conclusions.' },
];

const FORMALITY_OPTIONS: PrefOption[] = [
  { value: 'casual',   label: 'Casual & Encouraging', description: 'Friendly and supportive; builds confidence and reduces anxiety.' },
  { value: 'balanced', label: 'Balanced',              description: 'Professional but approachable; suits most educational settings.' },
  { value: 'formal',   label: 'Formal & Academic',     description: 'Precise academic language and professional instructional style.' },
];

const DEPTH_OPTIONS: PrefOption[] = [
  { value: 'surface',  label: 'Surface',   description: 'Key concepts and practical understanding only.' },
  { value: 'standard', label: 'Standard',  description: 'Conceptual explanations with enough detail for application.' },
  { value: 'deep',     label: 'Deep',      description: 'Theory, edge cases, and deeper implications explored fully.' },
];

const ENCOURAGEMENT_OPTIONS: PrefOption[] = [
  { value: 'high',    label: 'High',    description: 'Frequent positive reinforcement and acknowledgment of progress.' },
  { value: 'neutral', label: 'Neutral', description: 'Encouragement when appropriate; focus stays on instruction.' },
  { value: 'minimal', label: 'Minimal', description: 'Neutral instructional style; limited motivational language.' },
];

const LANGUAGE_OPTIONS: PrefOption[] = [
  { value: 'introductory', label: 'Introductory', description: 'Simple language; define technical terms; avoid jargon.' },
  { value: 'intermediate', label: 'Intermediate', description: 'Standard academic terminology; concepts remain accessible.' },
  { value: 'advanced',     label: 'Advanced',     description: 'Advanced terminology; assumes strong foundational knowledge.' },
  { value: 'adaptive',     label: 'Adaptive',     description: 'Adjusts complexity based on the student\'s demonstrated understanding.' },
];

// ─── page ─────────────────────────────────────────────────────────────────────

const STEP_LABELS: Record<Step, string> = {
  template:    'Choose Template',
  info:        'Name & Details',
  preferences: 'Teaching Style',
};
const STEPS: Step[] = ['template', 'info', 'preferences'];

export default function CreateAvatarPage() {
  const router          = useRouter();
  const { user }        = useAuth();
  const [step,          setStep]       = useState<Step>('template');
  const [templates,     setTemplates]  = useState<AvatarTemplateSummary[]>([]);
  const [loadingT,      setLoadingT]   = useState(true);
  const [selectedT,     setSelectedT]  = useState<AvatarTemplateSummary | null>(null);
  const [name,          setName]       = useState('');
  const [desc,          setDesc]       = useState('');
  const [submitting,    setSubmitting] = useState(false);
  const [error,         setError]      = useState<string | null>(null);

  // Teaching preferences
  const [prefs, setPrefs] = useState<TeachingPreferences>({});

  // Post-session check: UI-only, not sent to backend yet
  const [postSessionCheck, setPostSessionCheck] = useState<'enabled' | 'disabled'>('enabled');

  const setPref = <K extends keyof TeachingPreferences>(key: K, val: TeachingPreferences[K]) =>
    setPrefs((p) => ({ ...p, [key]: val }));

  useEffect(() => {
    publisherTemplateApi.list()
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoadingT(false));
  }, []);

  const handleSelectTemplate = (t: AvatarTemplateSummary) => {
    setSelectedT(t);
    const firstName = user?.firstName || user?.username || '';
    setName(firstName ? `${firstName}'s ${t.name}` : t.name);
  };

  const goBack = () => {
    if (step === 'info')        { setStep('template'); return; }
    if (step === 'preferences') { setStep('info'); return; }
    router.back();
  };

  const handleCreate = async () => {
    if (!selectedT) return;
    if (!name.trim()) { setError('Avatar name is required'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const avatar = await avatarApi.create({
        template_id:          selectedT.id,
        name:                 name.trim(),
        description:          desc.trim() || undefined,
        teaching_preferences: Object.keys(prefs).length > 0 ? prefs : undefined,
      });
      router.push(`/publisher/avatars/${avatar.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to create avatar');
      setSubmitting(false);
    }
  };

  const currentStepIndex = STEPS.indexOf(step);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={goBack} className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create Avatar</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const done   = currentStepIndex > i;
          const active = step === s;
          return (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 text-xs font-medium ${
                active ? 'text-blue-600' : done ? 'text-green-600' : 'text-gray-400'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                  active ? 'bg-blue-600 text-white' : done ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {done ? <CheckCircle size={12} /> : i + 1}
                </div>
                <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Step 1: template picker ─────────────────────────────────────────── */}
      {step === 'template' && (
        <div className="space-y-4">
          <p className="text-gray-500 text-sm">Select a template. Only published templates are available.</p>
          {loadingT ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
              <Layers size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No published templates available yet.</p>
              <p className="text-gray-400 text-sm mt-1">Ask your admin to publish a template first.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {templates.map((t) => {
                const isSelected = selectedT?.id === t.id;
                return (
                  <button key={t.id} onClick={() => handleSelectTemplate(t)}
                    className={`text-left p-5 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-1'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}>
                    <div className="flex items-start gap-3">
                      <AvatarIcon imageUrl={t.avatar_image_url} name={t.name} size={40} rounded="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{t.name}</span>
                          {isSelected && <CheckCircle size={15} className="text-blue-600 flex-shrink-0" />}
                        </div>
                        {t.category && (
                          <span className="inline-flex items-center gap-1 text-xs text-indigo-600 mt-0.5">
                            <Tag size={10} /> {t.category}
                          </span>
                        )}
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {t.description || 'No description'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button onClick={() => { if (selectedT) { setError(null); setStep('info'); } }}
              disabled={!selectedT}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Next <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: name & description ──────────────────────────────────────── */}
      {step === 'info' && selectedT && (
        <div className="space-y-5">
          {/* Selected template badge */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <AvatarIcon imageUrl={selectedT.avatar_image_url} name={selectedT.name} size={36} rounded="lg" />
            <div>
              <p className="text-sm font-semibold text-blue-900">{selectedT.name}</p>
              {selectedT.category && <p className="text-xs text-blue-600">{selectedT.category}</p>}
            </div>
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Avatar Name <span className="text-red-500">*</span>
              </label>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={200}
                placeholder={`e.g., ${user?.firstName ? `${user.firstName}'s ${selectedT.name}` : selectedT.name}`}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
              <p className="text-xs text-gray-400 mt-1">Auto-filled from your name + template. You can customise it.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
                placeholder="What will this avatar specialise in for your students?"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => { setError(null); setStep('preferences'); }} disabled={!name.trim()}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Next — Teaching Style <ArrowRight size={16} />
            </button>
            <button onClick={() => setStep('template')}
              className="text-sm text-gray-500 px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors">
              Back
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: teaching preferences ───────────────────────────────────── */}
      {step === 'preferences' && selectedT && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <AvatarIcon imageUrl={selectedT.avatar_image_url} name={selectedT.name} size={36} rounded="lg" />
            <div>
              <p className="text-sm font-semibold text-blue-900">{name}</p>
              <p className="text-xs text-blue-600">{selectedT.name}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Teaching Style</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                These preferences shape the AI&apos;s teaching persona. You can leave any unset to use the
                default behaviour.
              </p>
            </div>

            <PrefGroup title="Pacing"           options={PACE_OPTIONS}         value={prefs.teaching_pace}       onChange={(v) => setPref('teaching_pace',       v as any)} />
            <PrefGroup title="Questioning Style" options={QUESTIONING_OPTIONS}  value={prefs.questioning_style}   onChange={(v) => setPref('questioning_style',   v as any)} />
            <PrefGroup title="Formality"         options={FORMALITY_OPTIONS}    value={prefs.formality_level}     onChange={(v) => setPref('formality_level',     v as any)} />
            <PrefGroup title="Explanation Depth" options={DEPTH_OPTIONS}        value={prefs.depth_level}         onChange={(v) => setPref('depth_level',         v as any)} />
            <PrefGroup title="Encouragement"     options={ENCOURAGEMENT_OPTIONS} value={prefs.encouragement_level} onChange={(v) => setPref('encouragement_level', v as any)} />
            <PrefGroup title="Language Complexity" options={LANGUAGE_OPTIONS}   value={prefs.language_level}      onChange={(v) => setPref('language_level',      v as any)} />

            {/* Post-Session Check — UI only, not sent to backend */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-800">Post-Session Check</p>
              <div className="flex gap-3">
                {(['enabled', 'disabled'] as const).map((val) => (
                  <button key={val} type="button" onClick={() => setPostSessionCheck(val)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all capitalize ${
                      postSessionCheck === val
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}>
                    {val}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400">
                Post-session check configuration is stored locally and will be activated in a future release.
              </p>
            </div>
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          <div className="flex items-center gap-3">
            <button onClick={handleCreate} disabled={submitting}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">
              {submitting ? 'Creating…' : 'Create Avatar'}
            </button>
            <button onClick={() => setStep('info')}
              className="text-sm text-gray-500 px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
