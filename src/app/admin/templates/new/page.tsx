"use client";

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { templateApi, ApiError } from '@/lib/avatarApi';
import { ArrowLeft, Layers, Camera, X } from 'lucide-react';

const CATEGORY_OPTIONS = [
  'Education',
  'Medical',
  'Legal',
  'Research',
  'Interview Prep',
  'Business',
  'Language Learning',
  'Other',
];

export default function NewTemplatePage() {
  const router   = useRouter();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ name: '', description: '', category: '' });
  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearImage = () => { setImageFile(null); setImagePreview(null); };

  const handleCreate = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError(null);
    try {
      // 1. Create the template
      const t = await templateApi.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category || undefined,
      });

      // 2. Upload image if one was selected
      if (imageFile) {
        const fd = new FormData();
        fd.append('file', imageFile);
        await templateApi.uploadImage(t.id, fd);
      }

      // 3. Navigate to the template editor
      router.push(`/admin/templates/${t.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Create failed');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/admin/templates" className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 w-fit">
        <ArrowLeft size={16} /> Templates
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
          <Layers size={20} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">New Template</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Create a template that publishers can instantiate into avatars.</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
        <div className="p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Basic Information</h2>

          {/* Avatar image upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Avatar Image <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="flex items-center gap-4">
              {/* Preview / placeholder */}
              <div
                onClick={() => fileRef.current?.click()}
                className="relative w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex-shrink-0 group overflow-hidden"
              >
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                      <Camera size={18} className="text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-400">
                    <Camera size={20} />
                    <span className="text-[10px] font-medium">Upload</span>
                  </div>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleImagePick}
              />

              <div className="text-sm space-y-1">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  {imageFile ? 'Replace image' : 'Choose image'}
                </button>
                {imageFile && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">{imageFile.name}</span>
                    <button
                      type="button"
                      onClick={clearImage}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-400">PNG, JPG, WEBP, or SVG. Shown across all avatar listings.</p>
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={set('name')}
              maxLength={200}
              placeholder="e.g., ProfSidekick, MedicalSidekick, LawMentor..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={set('category')}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-gray-800"
            >
              <option value="">Select a category...</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={3}
              placeholder="What does this template enable publishers to build?"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
            />
          </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-b-xl">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Layers size={14} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Prompts are added after creation</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                After creating the template you will be taken to the template editor where you can write
                and publish the Conversation Prompt and Document Analysis Prompt, manage roles, and track version history.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleCreate}
          disabled={saving || !form.name.trim()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium text-sm"
        >
          {saving ? 'Creating...' : 'Create Template'}
        </button>
        <Link href="/admin/templates"
          className="text-sm text-gray-500 dark:text-gray-400 px-4 py-2.5 rounded-lg hover:bg-gray-100 dark:bg-gray-800 transition-colors">
          Cancel
        </Link>
      </div>
    </div>
  );
}
