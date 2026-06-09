"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Copy, Check, X, Trash2, RefreshCw } from 'lucide-react';
import { useCourseAccessCodes, CourseAccessCode } from '@/hooks/useCourseAccessCodes';

interface AccessCodePanelProps {
  courseId: string;
}

export default function AccessCodePanel({ courseId }: AccessCodePanelProps) {
  const { getCodes, generateCode, revokeCode } = useCourseAccessCodes();

  const [codes, setCodes] = useState<CourseAccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadCodes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCodes(courseId);
      setCodes(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load codes');
    } finally {
      setLoading(false);
    }
  }, [courseId, getCodes]);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    try {
      const result = await generateCode(courseId, {
        max_uses: maxUses ? parseInt(maxUses) : null,
        expires_at: expiresAt || null,
      });
      setGeneratedCode(result.code);
      setShowForm(false);
      setMaxUses('');
      setExpiresAt('');
      await loadCodes();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate code');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedCode) return;
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (codeId: string) => {
    setRevoking(codeId);
    try {
      await revokeCode(codeId);
      await loadCodes();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke code');
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Key className="w-6 h-6" />
          Access Codes
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCodes}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Generate Code
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <X className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Newly generated code — shown prominently until dismissed */}
      {generatedCode && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm font-medium text-green-800 mb-2">
            New code generated — share this with your students:
          </p>
          <div className="flex items-center gap-3">
            <code className="font-mono text-2xl font-bold text-green-900 tracking-widest flex-1">
              {generatedCode}
            </code>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              {copied
                ? <><Check className="w-4 h-4" /> Copied</>
                : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
            <button
              onClick={() => setGeneratedCode(null)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Generate form */}
      {showForm && (
        <form
          onSubmit={handleGenerate}
          className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50"
        >
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">New Access Code</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Uses <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expires At <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <><Plus className="w-4 h-4" /> Generate</>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setMaxUses(''); setExpiresAt(''); }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Codes table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <Key className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No access codes yet.</p>
          <p className="text-xs text-gray-400 mt-1">Generate a code to share with your students.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-gray-400">Code</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-gray-400">Uses</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-gray-400">Expires</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="text-right py-2 font-medium text-gray-600 dark:text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {codes.map((c) => (
                <tr key={c.id} className={c.is_active ? '' : 'opacity-50'}>
                  <td className="py-3 pr-4">
                    <code className="font-mono font-medium text-gray-900 dark:text-gray-100 tracking-wider">
                      {c.code}
                    </code>
                  </td>
                  <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                    {c.uses_count}{c.max_uses !== null ? ` / ${c.max_uses}` : ''}
                  </td>
                  <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      {c.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {c.is_active && (
                      <button
                        onClick={() => handleRevoke(c.id)}
                        disabled={revoking === c.id}
                        className="text-red-500 hover:text-red-700 disabled:opacity-50 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Revoke code"
                      >
                        {revoking === c.id
                          ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
