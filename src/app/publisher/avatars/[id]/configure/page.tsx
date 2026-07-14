"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { configApi, ApiError } from '@/lib/avatarApi';
import { voiceApi } from '@/lib/voiceApi';
import type { AvatarConfigurationResponse, TtsProvider, VoiceCatalogEntry } from '@/types/avatar';
import { ArrowLeft, Save, Box, Play, Square, Loader2 } from 'lucide-react';
import { usePublisherModels } from '@/hooks/usePublisherModels';
import type { Avatar3DModel } from '@/hooks/useAdminModels';
import { useVoicePreview } from '@/hooks/useVoicePreview';

const GlbAvatarPreview = dynamic(
  () => import('@/components/avatar/GlbAvatarPreview'),
  { ssr: false },
);

const VOICES = ['alloy','ash','ballad','coral','echo','sage','shimmer','verse'];
const DIFFICULTIES = ['beginner','intermediate','advanced'];
const LANGUAGES = ['English','Arabic','French','Spanish','German','Chinese','Japanese'];
const ENGINES: { id: TtsProvider; label: string }[] = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'elevenlabs', label: 'ElevenLabs' },
];

export default function ConfigurePage() {
  const { id } = useParams<{ id: string }>();
  const [config, setConfig] = useState<AvatarConfigurationResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [previewModel, setPreviewModel] = useState<Avatar3DModel | null>(null);

  const [form, setForm] = useState<{
    voice: string;
    language: string;
    difficulty_level: string;
    additional_settings: Record<string, any>;
    tts_provider: TtsProvider;
  }>({
    voice: '',
    language: 'English',
    difficulty_level: 'intermediate',
    additional_settings: {},
    tts_provider: 'openai',
  });

  const [elevenLabsVoices, setElevenLabsVoices] = useState<VoiceCatalogEntry[]>([]);
  const [elevenLabsVoicesLoading, setElevenLabsVoicesLoading] = useState(false);
  const [elevenLabsVoicesError, setElevenLabsVoicesError] = useState<string | null>(null);

  const { models, loading: modelsLoading } = usePublisherModels();
  const voicePreview = useVoicePreview();

  useEffect(() => {
    configApi.get(id)
      .then((c) => {
        setConfig(c);
        setForm({
          voice: c.voice || 'alloy',
          language: c.language || 'English',
          difficulty_level: c.difficulty_level || 'intermediate',
          additional_settings: c.additional_settings || {},
          tts_provider: c.tts_provider || 'openai',
        });
      })
      .catch(() => {
        setForm({
          voice: 'alloy',
          language: 'English',
          difficulty_level: 'intermediate',
          additional_settings: {},
          tts_provider: 'openai',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (form.tts_provider !== 'elevenlabs') return;
    setElevenLabsVoicesLoading(true);
    setElevenLabsVoicesError(null);
    voiceApi.getCatalog('elevenlabs')
      .then((res) => setElevenLabsVoices(res.voices))
      .catch(() => setElevenLabsVoicesError('Could not load ElevenLabs voices'))
      .finally(() => setElevenLabsVoicesLoading(false));
  }, [form.tts_provider]);

  const handleSave = async () => {
    setSaving(true); setError(null); setSuccess(false);
    try {
      const saved = await configApi.upsert(id, form);
      setConfig(saved);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const selectModel = (model: Avatar3DModel) => {
    const modelUrl = model.model_url ?? model.file_path ?? '';
    setForm((p) => ({
      ...p,
      additional_settings: {
        ...p.additional_settings,
        renderType: '3d',
        glbLibraryId: modelUrl,
      }
    }));
  };

  const isModelSelected = (model: Avatar3DModel) => {
    const modelUrl = model.model_url ?? model.file_path ?? '';
    return (
      form.additional_settings?.renderType === '3d' &&
      (form.additional_settings?.glbLibraryId === model.id ||
       form.additional_settings?.glbLibraryId === modelUrl)
    );
  };

  const threeJsModels = models.filter(m => m.model_type === 'three_js' || !m.model_type);

  if (loading || modelsLoading) return <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse max-w-2xl" />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href={`/publisher/avatars/${id}`} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 w-fit">
        <ArrowLeft size={16} /> Back to Avatar
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configure Avatar</h1>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      {success && <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-primary/90 text-sm">Configuration saved!</div>}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">

        {/* Voice Engine */}
        <div className="p-6 space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Voice Engine</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Which service synthesizes this avatar&apos;s speech during sessions.</p>
          <div className="flex gap-3">
            {ENGINES.map((e) => (
              <button key={e.id}
                onClick={() => { voicePreview.stop(); setForm((p) => ({ ...p, tts_provider: e.id, voice: '' })); }}
                className={`flex-1 py-2.5 text-sm rounded-lg border transition-all font-medium ${
                  form.tts_provider === e.id ? 'border-[#133221] bg-primary/5 dark:bg-gray-800 text-[#133221]' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-700 dark:text-gray-300'
                }`}>
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice */}
        <div className="p-6 space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Voice</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">The voice your avatar uses during sessions. Click the play icon to hear a preview.</p>
          {voicePreview.error && <p className="text-xs text-red-600">{voicePreview.error}</p>}
          {form.tts_provider === 'openai' ? (
            <div className="grid grid-cols-4 gap-2">
              {VOICES.map((v) => {
                const selected = form.voice === v;
                const isPlaying = voicePreview.playingId === v;
                const isLoading = voicePreview.loadingId === v;
                return (
                  <div key={v}
                    className={`flex items-center rounded-lg border transition-all ${
                      selected ? 'border-[#133221] bg-primary/5 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}>
                    <button onClick={() => setForm((p) => ({ ...p, voice: v }))}
                      className={`flex-1 min-w-0 px-3 py-2 text-sm text-left capitalize truncate ${
                        selected ? 'text-[#133221] font-medium' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                      {v}
                    </button>
                    <button
                      onClick={() => voicePreview.play('openai', v)}
                      title={isPlaying ? 'Stop preview' : 'Preview voice'}
                      aria-label={isPlaying ? `Stop preview of ${v}` : `Preview ${v}`}
                      className="shrink-0 p-2 text-gray-500 hover:text-[#133221] dark:hover:text-gray-100"
                    >
                      {isLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : isPlaying ? (
                        <Square size={14} />
                      ) : (
                        <Play size={14} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : elevenLabsVoicesLoading ? (
            <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ) : elevenLabsVoicesError ? (
            <p className="text-sm text-red-600">{elevenLabsVoicesError}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {elevenLabsVoices.map((v) => {
                const selected = form.voice === v.id;
                const isPlaying = voicePreview.playingId === v.id;
                const isLoading = voicePreview.loadingId === v.id;
                return (
                  <div key={v.id}
                    className={`flex items-center rounded-lg border transition-all ${
                      selected ? 'border-[#133221] bg-primary/5 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}>
                    <button onClick={() => setForm((p) => ({ ...p, voice: v.id }))}
                      className={`flex-1 min-w-0 px-3 py-2 text-sm text-left ${
                        selected ? 'text-[#133221] font-medium' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                      <div className="truncate">{v.name}</div>
                      {v.dialects.length > 0 && (
                        <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">{v.dialects.join(' · ')}</div>
                      )}
                    </button>
                    <button
                      onClick={() => voicePreview.play('elevenlabs', v.id)}
                      title={isPlaying ? 'Stop preview' : 'Preview voice'}
                      aria-label={isPlaying ? `Stop preview of ${v.name}` : `Preview ${v.name}`}
                      className="shrink-0 p-2 text-gray-500 hover:text-[#133221] dark:hover:text-gray-100"
                    >
                      {isLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : isPlaying ? (
                        <Square size={14} />
                      ) : (
                        <Play size={14} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Difficulty */}
        <div className="p-6 space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Difficulty Level</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Sets how demanding and detailed the AI&apos;s responses are.</p>
          <div className="flex gap-3">
            {DIFFICULTIES.map((d) => (
              <button key={d} onClick={() => setForm((p) => ({ ...p, difficulty_level: d }))}
                className={`flex-1 py-2.5 text-sm rounded-lg border transition-all capitalize ${
                  form.difficulty_level === d ? 'border-[#133221] bg-primary/5 dark:bg-gray-800 text-[#133221] font-semibold' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-700 dark:text-gray-300'
                }`}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Language / Dialect */}
        <div className="p-6 space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            {form.tts_provider === 'elevenlabs' ? 'Dialect' : 'Language'}
          </h2>
          {form.tts_provider === 'elevenlabs' && (
            <p className="text-sm text-gray-500 dark:text-gray-400">The regional accent/dialect ElevenLabs should use (e.g. Emirati Arabic).</p>
          )}
          <select value={form.language} onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#133221] focus:border-[#133221] text-sm">
            {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>

        {/* Visual Avatar Model */}
        <div className="p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Visual Avatar Model</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select the 3D visual appearance for your avatar. Click the preview icon to see it in 3D.</p>
          </div>

          {threeJsModels.length === 0 ? (
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
              No 3D models are currently available. Please contact your administrator.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {threeJsModels.map((model) => {
                  const selected = isModelSelected(model);
                  const thumb = model.thumbnail_url ?? model.preview_image_path ?? null;
                  return (
                    <div key={model.id} className="relative group">
                      <button
                        onClick={() => selectModel(model)}
                        className={`w-full flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                          selected
                            ? 'border-[#133221] bg-primary/5 dark:bg-gray-800'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-gray-900'
                        }`}
                      >
                        <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-3 relative">
                          {thumb ? (
                            <img src={thumb} alt={model.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full text-xs text-gray-400">No Preview</div>
                          )}
                          {selected && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-[#133221] rounded-full flex items-center justify-center text-white">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                          )}
                        </div>
                        <span className={`text-sm font-medium ${selected ? 'text-[#133221] dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                          {model.name}
                        </span>
                        {model.gender && (
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">{model.gender}</span>
                        )}
                      </button>

                      {/* 3D preview button */}
                      {(model.model_url ?? model.file_path) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setPreviewModel(previewModel?.id === model.id ? null : model); }}
                          title="View 3D model"
                          className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center shadow transition-all ${
                            previewModel?.id === model.id
                              ? 'bg-[#133221] text-white'
                              : 'bg-white/90 dark:bg-gray-700/90 text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <Box size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Inline GLB preview panel */}
              {previewModel && (previewModel.model_url ?? previewModel.file_path) && (
                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700" style={{ height: 380 }}>
                  <GlbAvatarPreview
                    glbUrl={(previewModel.model_url ?? previewModel.file_path)!}
                    amplitude={0}
                    showControls
                    framing="full"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 bg-[#133221] text-white px-6 py-2.5 rounded-lg hover:bg-[#0a1e13] disabled:opacity-50 transition-colors font-medium">
        <Save size={16} /> {saving ? 'Saving...' : config ? 'Update Configuration' : 'Save Configuration'}
      </button>
    </div>
  );
}
