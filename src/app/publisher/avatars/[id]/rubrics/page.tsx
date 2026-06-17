"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { configApi, rubricApi, ApiError } from '@/lib/avatarApi';
import type { RubricResponse } from '@/types/avatar';
import { ArrowLeft, Plus, Trash2, ClipboardList, AlertCircle, X } from 'lucide-react';

interface CriterionRow { name: string; weight: number; description: string; }

export default function RubricsPage() {
  const { id } = useParams<{ id: string }>();
  const [rubrics, setRubrics]   = useState<RubricResponse[]>([]);
  const [loading, setLoading]   = useState(true);
  const [noConfig, setNoConfig] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // new rubric form state
  const [rubricTitle, setRubricTitle] = useState('');
  const [criteria, setCriteria]       = useState<CriterionRow[]>([
    { name: '', weight: 100, description: '' },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    configApi.get(id)
      .then((c) => setRubrics(c.rubrics))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) setNoConfig(true);
        else setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const addCriterion = () =>
    setCriteria((p) => [...p, { name: '', weight: 0, description: '' }]);

  const removeCriterion = (i: number) =>
    setCriteria((p) => p.filter((_, idx) => idx !== i));

  const updateCriterion = (i: number, field: keyof CriterionRow, val: string | number) =>
    setCriteria((p) => p.map((c, idx) => idx === i ? { ...c, [field]: val } : c));

  const totalWeight = criteria.reduce((s, c) => s + Number(c.weight || 0), 0);

  const handleSave = async () => {
    if (!rubricTitle.trim()) { setError('Rubric title is required'); return; }
    if (totalWeight !== 100) { setError('Criteria weights must sum to 100'); return; }
    if (criteria.some((c) => !c.name.trim())) { setError('All criteria must have a name'); return; }

    const content: Record<string, unknown> = {};
    criteria.forEach((c) => { content[c.name] = { weight: c.weight, description: c.description }; });

    setSaving(true); setError(null);
    try {
      const rubric = await rubricApi.add(id, { title: rubricTitle.trim(), content });
      setRubrics((p) => [...p, rubric]);
      setShowForm(false);
      setRubricTitle(''); setCriteria([{ name: '', weight: 100, description: '' }]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rubricId: string) => {
    if (!confirm('Delete this rubric?')) return;
    setDeleting(rubricId);
    try {
      await rubricApi.delete(id, rubricId);
      setRubrics((p) => p.filter((r) => r.id !== rubricId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse max-w-2xl" />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href={`/publisher/avatars/${id}`} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 w-fit">
        <ArrowLeft size={16} /> Back to Avatar
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Rubrics</h1>
        {!noConfig && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#133221] text-white px-4 py-2 rounded-lg hover:bg-[#0a1e13] transition-colors text-sm font-medium">
            <Plus size={15} /> New Rubric
          </button>
        )}
      </div>

      {noConfig && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3 text-sm text-yellow-800">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>Configure your avatar first. <Link href={`/publisher/avatars/${id}/configure`} className="underline font-medium">Go to Configure →</Link></span>
        </div>
      )}

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {/* New rubric form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">New Rubric</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400"><X size={18} /></button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rubric Title</label>
            <input value={rubricTitle} onChange={(e) => setRubricTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#133221] text-sm"
              placeholder="e.g., Oral Examination Rubric" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Criteria</label>
              <span className={`text-xs font-medium ${totalWeight === 100 ? 'text-primary' : 'text-red-500'}`}>
                Total: {totalWeight}% {totalWeight !== 100 && '(must be 100%)'}
              </span>
            </div>

            {criteria.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_auto] gap-2 items-start p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="space-y-2">
                  <input value={c.name} onChange={(e) => updateCriterion(i, 'name', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#133221]"
                    placeholder="Criterion name" />
                  <input value={c.description} onChange={(e) => updateCriterion(i, 'description', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#133221]"
                    placeholder="Description (optional)" />
                </div>
                <div className="flex items-center gap-1">
                  <input type="number" min={0} max={100} value={c.weight}
                    onChange={(e) => updateCriterion(i, 'weight', parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-[#133221]" />
                  <span className="text-xs text-gray-400">%</span>
                </div>
                <button onClick={() => removeCriterion(i)} disabled={criteria.length === 1}
                  className="text-gray-400 hover:text-red-500 disabled:opacity-30 mt-1.5">
                  <X size={15} />
                </button>
              </div>
            ))}

            <button onClick={addCriterion}
              className="flex items-center gap-1 text-sm text-[#133221] hover:text-[#133221] font-medium">
              <Plus size={14} /> Add criterion
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)}
              className="flex-1 border border-gray-300 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-50 dark:bg-gray-900 text-sm transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-[#133221] text-white py-2 rounded-lg hover:bg-[#0a1e13] disabled:opacity-50 text-sm transition-colors">
              {saving ? 'Saving...' : 'Save Rubric'}
            </button>
          </div>
        </div>
      )}

      {/* Rubric list */}
      <div className="space-y-3">
        {rubrics.length === 0 && !showForm ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <ClipboardList size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No rubrics yet.</p>
          </div>
        ) : rubrics.map((r) => (
          <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{r.title}</h3>
              <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id}
                className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40">
                <Trash2 size={15} />
              </button>
            </div>
            <div className="space-y-1.5">
              {Object.entries(r.content as Record<string, { weight: number; description?: string }>).map(([name, val]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{name}</span>
                  <div className="flex items-center gap-2">
                    {val.description && <span className="text-gray-400 text-xs">{val.description}</span>}
                    <span className="font-medium text-[#133221]">{val.weight}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
