"use client";

import React from 'react';
import { Sparkles, Save } from 'lucide-react';

interface RefinedPromptEditorProps {
  additionalInstructions: string;
  onAdditionalInstructionsChange: (value: string) => void;
  refinedPrompt: string;
  onRefinedPromptChange: (value: string) => void;
  onRefine: () => void;
  onSave: () => void;
  refining?: boolean;
  saving?: boolean;
  error?: string | null;
}

export default function RefinedPromptEditor({
  additionalInstructions,
  onAdditionalInstructionsChange,
  refinedPrompt,
  onRefinedPromptChange,
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

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Optional: describe anything not covered by the preference dropdowns, then
        click Refine to generate an AI teaching prompt. You can edit the result
        before saving.
      </p>

      <div>
        <label
          htmlFor="additional-instructions"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Additional instructions (optional)
        </label>
        <textarea
          id="additional-instructions"
          value={additionalInstructions}
          onChange={(e) => onAdditionalInstructionsChange(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500"
          placeholder="e.g. Use examples from clinical medicine, encourage debate, avoid jargon..."
        />
      </div>

      <button
        type="button"
        onClick={onRefine}
        disabled={refining}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        <Sparkles size={18} />
        {refining ? 'Refining...' : 'Refine'}
      </button>

      {refinedPrompt.trim().length > 0 && (
        <>
          <div>
            <label
              htmlFor="refined-prompt"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Refined prompt (editable)
            </label>
            <textarea
              id="refined-prompt"
              value={refinedPrompt}
              onChange={(e) => onRefinedPromptChange(e.target.value)}
              rows={12}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 font-mono focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:border-emerald-500 dark:border-emerald-500"
            />
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 dark:bg-emerald-700 text-white font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save refined prompt'}
          </button>
        </>
      )}
    </div>
  );
}
