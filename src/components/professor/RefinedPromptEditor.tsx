"use client";

import React from 'react';
import { Sparkles, Save } from 'lucide-react';

interface RefinedPromptEditorProps {
  refinedPrompt: string;
  onChange: (value: string) => void;
  onRefine: () => void;
  onSave: () => void;
  refining?: boolean;
  saving?: boolean;
  error?: string | null;
}

export default function RefinedPromptEditor({
  refinedPrompt,
  onChange,
  onRefine,
  onSave,
  refining,
  saving,
  error,
}: RefinedPromptEditorProps) {
  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <p className="text-sm text-gray-600">
        Review the refined teaching prompt below. Edit it if needed, then save.
      </p>

      <textarea
        value={refinedPrompt}
        onChange={(e) => onChange(e.target.value)}
        rows={14}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="Click Refine to generate your persona prompt..."
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRefine}
          disabled={refining}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          <Sparkles size={18} />
          {refining ? 'Refining...' : 'Refine'}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !refinedPrompt.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save persona'}
        </button>
      </div>
    </div>
  );
}
