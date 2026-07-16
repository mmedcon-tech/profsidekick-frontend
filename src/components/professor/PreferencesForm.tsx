"use client";

import React from 'react';
import type { PersonaPreferenceSelections } from '@/types/types';

interface PreferencesFormProps {
  preferences: PersonaPreferenceSelections;
  onChange: (preferences: PersonaPreferenceSelections) => void;
}

const FIELDS: {
  key: keyof PersonaPreferenceSelections;
  label: string;
  options: { value: string; label: string }[];
}[] = [
    {
      key: 'teachingStyle',
      label: 'Style',
      options: [
        { value: 'collaborative', label: 'Collaborative' },
        { value: 'lecture', label: 'Lecture-based' },
        { value: 'socratic', label: 'Socratic' },
        { value: 'hands-on', label: 'Hands-on' },
      ],
    },
    {
      key: 'tone',
      label: 'Tone',
      options: [
        { value: 'encouraging', label: 'Encouraging' },
        { value: 'formal', label: 'Formal' },
        { value: 'casual', label: 'Casual' },
        { value: 'enthusiastic', label: 'Enthusiastic' },
      ],
    },
    {
      key: 'pace',
      label: 'Pace',
      options: [
        { value: 'slow', label: 'Slow' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'fast', label: 'Fast' },
      ],
    },
    {
      key: 'interactionLevel',
      label: 'Interaction',
      options: [
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
      ],
    },
    {
      key: 'subjectFocus',
      label: 'Subject focus',
      options: [
        { value: 'conceptual understanding', label: 'Conceptual understanding' },
        { value: 'exam preparation', label: 'Exam preparation' },
        { value: 'problem solving', label: 'Problem solving' },
        { value: 'real-world application', label: 'Real-world application' },
      ],
    },
  ];

export default function PreferencesForm({ preferences, onChange }: PreferencesFormProps) {
  const update = (key: keyof PersonaPreferenceSelections, value: string) => {
    onChange({ ...preferences, [key]: value });
  };

  return (
    <div className="space-y-5">
      {FIELDS.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {field.label}
          </label>
          <select
            value={preferences[field.key]}
            onChange={(e) => update(field.key, e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50"
          >
            {field.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
