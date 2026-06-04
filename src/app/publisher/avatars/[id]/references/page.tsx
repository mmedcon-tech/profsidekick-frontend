"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { configApi, referenceApi, ApiError } from '@/lib/avatarApi';
import type { ReferenceSolutionResponse } from '@/types/avatar';
import { ArrowLeft, Upload, FileCheck, Trash2, AlertCircle } from 'lucide-react';

export default function ReferencesPage() {
  const { id } = useParams<{ id: string }>();
  const fileRef = useRef<HTMLInputElement>(null);
  const [refs, setRefs]         = useState<ReferenceSolutionResponse[]>([]);
  const [loading, setLoading]   = useState(true);
  const [noConfig, setNoConfig] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [title, setTitle]         = useState('');

  useEffect(() => {
    configApi.get(id)
      .then((c) => setRefs(c.reference_solutions))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) setNoConfig(true);
        else setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !title.trim()) { setError('Provide a title and select a file'); return; }
    const fd = new FormData();
    fd.append('title', title.trim());
    fd.append('file', file);
    setUploading(true); setError(null);
    try {
      const ref = await referenceApi.add(id, fd);
      setRefs((prev) => [...prev, ref]);
      setTitle('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (refId: string) => {
    if (!confirm('Delete this reference solution?')) return;
    setDeleting(refId);
    try {
      await referenceApi.delete(id, refId);
      setRefs((prev) => prev.filter((r) => r.id !== refId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const fmtSize = (b: number | null) => b ? `${(b / 1024).toFixed(1)} KB` : '';

  if (loading) return <div className="h-48 bg-gray-100 rounded-xl animate-pulse max-w-2xl" />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href={`/publisher/avatars/${id}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 w-fit">
        <ArrowLeft size={16} /> Back to Avatar
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Reference Solutions</h1>

      {noConfig && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3 text-sm text-yellow-800">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>Configure your avatar first. <Link href={`/publisher/avatars/${id}/configure`} className="underline font-medium">Go to Configure →</Link></span>
        </div>
      )}

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {!noConfig && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Upload Reference Solution</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="e.g., Problem Set 1 — Model Answer" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.md"
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:border file:border-gray-300 file:rounded-lg file:text-sm file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100" />
          </div>
          <button onClick={handleUpload} disabled={uploading || !title.trim()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium">
            <Upload size={15} /> {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {refs.length === 0 ? (
          <div className="text-center py-12">
            <FileCheck size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">No reference solutions yet.</p>
          </div>
        ) : refs.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-4">
            <FileCheck size={18} className="text-green-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">{r.title}</p>
              <p className="text-xs text-gray-400">
                {r.file_name} {fmtSize(r.file_size)} · {new Date(r.created_at).toLocaleDateString()}
              </p>
            </div>
            <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id}
              className="text-gray-400 hover:text-red-500 transition-colors p-1 disabled:opacity-40">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
