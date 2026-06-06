"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { configApi, ApiError } from '@/lib/avatarApi';
import type { AvatarConfigurationResponse } from '@/types/avatar';
import { ArrowLeft, Save } from 'lucide-react';

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

  const [form, setForm] = useState({
    voice: '',
    language: 'English',
    difficulty_level: 'intermediate',
  });

  useEffect(() => {
    configApi.get(id)
      .then((c) => { setConfig(c); setForm({ voice: c.voice || 'alloy', language: c.language || 'English', difficulty_level: c.difficulty_level || 'intermediate' }); })
      .catch(() => { /* 404 = not configured yet */ setForm({ voice: 'alloy', language: 'English', difficulty_level: 'intermediate' }); })
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

  if (loading) return <div className="h-48 bg-gray-100 rounded-xl animate-pulse max-w-2xl" />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href={`/publisher/avatars/${id}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 w-fit">
        <ArrowLeft size={16} /> Back to Avatar
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Configure Avatar</h1>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">Configuration saved!</div>}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {/* Voice */}
        <div className="p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Voice</h2>
          <p className="text-sm text-gray-500">The voice your avatar uses during sessions.</p>
          <div className="grid grid-cols-4 gap-2">
            {VOICES.map((v) => (
              <button key={v} onClick={() => setForm((p) => ({ ...p, voice: v }))}
                className={`px-3 py-2 text-sm rounded-lg border transition-all capitalize ${
                  form.voice === v ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Difficulty Level</h2>
          <p className="text-sm text-gray-500">Sets how demanding and detailed the AI&apos;s responses are.</p>
          <div className="flex gap-3">
            {DIFFICULTIES.map((d) => (
              <button key={d} onClick={() => setForm((p) => ({ ...p, difficulty_level: d }))}
                className={`flex-1 py-2.5 text-sm rounded-lg border transition-all capitalize ${
                  form.difficulty_level === d ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Language</h2>
          <select value={form.language} onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm">
            {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium">
        <Save size={16} /> {saving ? 'Saving...' : config ? 'Update Configuration' : 'Save Configuration'}
      </button>
    </div>
  );
}
