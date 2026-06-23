"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { configApi, ApiError } from '@/lib/avatarApi';
import type { AvatarConfigurationResponse } from '@/types/avatar';
import { ArrowLeft, Save } from 'lucide-react';
import { useAdminModels } from '@/hooks/useAdminModels';

const VOICES = ['alloy','ash','ballad','coral','echo','sage','shimmer','verse'];
const DIFFICULTIES = ['beginner','intermediate','advanced'];
const LANGUAGES = ['English','Arabic','French','Spanish','German','Chinese','Japanese'];

export default function ConfigurePage() {
  const { id } = useParams<{ id: string }>();
  const [config, setConfig] = useState<AvatarConfigurationResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const [form, setForm] = useState<{
    voice: string;
    language: string;
    difficulty_level: string;
    additional_settings: Record<string, any>;
  }>({
    voice: '',
    language: 'English',
    difficulty_level: 'intermediate',
    additional_settings: {},
  });

  const { models: adminModels, loading: modelsLoading } = useAdminModels();

  useEffect(() => {
    configApi.get(id)
      .then((c) => { 
        setConfig(c); 
        setForm({ 
          voice: c.voice || 'alloy', 
          language: c.language || 'English', 
          difficulty_level: c.difficulty_level || 'intermediate',
          additional_settings: c.additional_settings || {}
        }); 
      })
      .catch(() => { 
        /* 404 = not configured yet */ 
        setForm({ 
          voice: 'alloy', 
          language: 'English', 
          difficulty_level: 'intermediate',
          additional_settings: {}
        }); 
      })
      .finally(() => setLoading(false));
  }, [id]);

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
        {/* Voice */}
        <div className="p-6 space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Voice</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">The voice your avatar uses during sessions.</p>
          <div className="grid grid-cols-4 gap-2">
            {VOICES.map((v) => (
              <button key={v} onClick={() => setForm((p) => ({ ...p, voice: v }))}
                className={`px-3 py-2 text-sm rounded-lg border transition-all capitalize ${
                  form.voice === v ? 'border-[#133221] bg-primary/5 dark:bg-gray-800 text-[#133221] font-medium' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-700 dark:text-gray-300'
                }`}>
                {v}
              </button>
            ))}
          </div>
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

        {/* Language */}
        <div className="p-6 space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Language</h2>
          <select value={form.language} onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#133221] focus:border-[#133221] text-sm">
            {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>

        {/* Visual Avatar Model */}
        <div className="p-6 space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Visual Avatar Model</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Select the 3D visual appearance for your avatar.</p>
          {adminModels.length === 0 ? (
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">No 3D models are currently available. Please contact your administrator.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {adminModels.filter(m => m.model_type === 'three_js').map((model) => {
                // Determine if this model is selected
                const isSelected = 
                  form.additional_settings?.renderType === 'glb' &&
                  (form.additional_settings?.glbLibraryId === model.id || 
                   form.additional_settings?.glbLibraryId === model.model_url);
                   
                return (
                  <button
                    key={model.id}
                    onClick={() => setForm((p) => ({
                      ...p,
                      additional_settings: {
                        ...p.additional_settings,
                        renderType: 'glb',
                        glbLibraryId: model.model_url // Saving model_url as glbLibraryId so frontend can resolve it directly
                      }
                    }))}
                    className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? 'border-[#133221] bg-primary/5 dark:bg-gray-800' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-gray-900'
                    }`}
                  >
                    <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-3 relative">
                      {model.thumbnail_url ? (
                        <img src={model.thumbnail_url} alt={model.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-xs text-gray-400">No Preview</div>
                      )}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-[#133221] rounded-full flex items-center justify-center text-white">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                      )}
                    </div>
                    <span className={`text-sm font-medium ${isSelected ? 'text-[#133221] dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                      {model.name}
                    </span>
                    {model.gender && (
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">{model.gender}</span>
                    )}
                  </button>
                );
              })}
            </div>
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
