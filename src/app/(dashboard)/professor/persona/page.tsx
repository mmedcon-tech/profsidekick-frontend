"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProfessorRoute from '@/components/auth/ProfessorRoute';
import AvatarPicker from '@/components/professor/AvatarPicker';
import PreferencesForm from '@/components/professor/PreferencesForm';
import RefinedPromptEditor from '@/components/professor/RefinedPromptEditor';
import { useAvatars } from '@/hooks/useAvatars';
import { useProfessorPersona } from '@/hooks/useProfessorPersona';
import { DEFAULT_PERSONA_PREFERENCES } from '@/types/types';
import type { PersonaPreferenceSelections } from '@/types/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const STEPS = ['Choose avatar', 'Set preferences', 'Refine (optional)'];

export default function ProfessorPersonaPage() {
  const router = useRouter();
  const { avatars, loading: avatarsLoading, error: avatarsError } = useAvatars();
  const {
    persona,
    loading: personaLoading,
    error: personaError,
    saving,
    refining,
    upsertPersona,
    refinePersona,
  } = useProfessorPersona();

  const [step, setStep] = useState(0);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<PersonaPreferenceSelections>(
    DEFAULT_PERSONA_PREFERENCES,
  );
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [refinedPrompt, setRefinedPrompt] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (persona) {
      setSelectedAvatarId(persona.avatarId);
      setPreferences(persona.preferences);
      setRefinedPrompt(persona.refinedPrompt);
    }
  }, [persona]);

  useEffect(() => {
    if (!selectedAvatarId && avatars.length > 0) {
      setSelectedAvatarId(avatars[0].id);
    }
  }, [avatars, selectedAvatarId]);

  const handleSaveProfile = async (redirectAfter = false) => {
    if (!selectedAvatarId) return false;
    setSaveMessage(null);
    const result = await upsertPersona({
      avatarId: selectedAvatarId,
      preferences,
      refinedPrompt: refinedPrompt.trim() || undefined,
    });
    if (result) {
      setSaveMessage('Profile saved successfully.');
      if (redirectAfter) {
        router.push('/dashboard');
      }
      return true;
    }
    return false;
  };

  const handleRefine = async () => {
    if (!selectedAvatarId) return;
    setSaveMessage(null);
    const result = await refinePersona({
      avatarId: selectedAvatarId,
      preferences,
      additionalInstructions: additionalInstructions.trim() || undefined,
    });
    if (result) {
      setRefinedPrompt(result.refinedPrompt);
    }
  };

  const handleSaveRefined = async () => {
    await handleSaveProfile(false);
  };

  if (personaLoading && !persona) {
    return (
      <ProfessorRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </ProfessorRoute>
    );
  }

  return (
    <ProfessorRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Persona</h1>
            <p className="text-gray-600 mt-1">
              Configure how your AI teaching assistant presents itself in sessions.
            </p>
          </div>

          <div className="flex gap-2 mb-8">
            {STEPS.map((label, index) => (
              <div
                key={label}
                className={`flex-1 text-center py-2 px-2 rounded-lg text-sm font-medium ${
                  index === step
                    ? 'bg-blue-600 text-white'
                    : index < step
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-white text-gray-500 border border-gray-200'
                }`}
              >
                {index + 1}. {label}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            {personaError && step !== 2 && (
              <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm">
                {personaError}
              </div>
            )}

            {step === 0 && (
              <AvatarPicker
                avatars={avatars}
                selectedId={selectedAvatarId}
                onSelect={setSelectedAvatarId}
                loading={avatarsLoading}
                error={avatarsError}
              />
            )}

            {step === 1 && (
              <>
                <PreferencesForm preferences={preferences} onChange={setPreferences} />
                <p className="mt-4 text-sm text-gray-500">
                  You can save your profile now, or optionally refine it with AI in
                  the next step.
                </p>
              </>
            )}

            {step === 2 && (
              <>
                <RefinedPromptEditor
                  additionalInstructions={additionalInstructions}
                  onAdditionalInstructionsChange={setAdditionalInstructions}
                  refinedPrompt={refinedPrompt}
                  onRefinedPromptChange={setRefinedPrompt}
                  onRefine={handleRefine}
                  onSave={handleSaveRefined}
                  refining={refining}
                  saving={saving}
                  error={personaError}
                />
              </>
            )}

            {saveMessage && (
              <p className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                {saveMessage}
              </p>
            )}

            <div className="flex flex-wrap justify-between gap-3 mt-8 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(s - 1, 0))}
                disabled={step === 0}
                className="inline-flex items-center gap-1 px-4 py-2 text-gray-700 disabled:opacity-40"
              >
                <ChevronLeft size={18} />
                Back
              </button>

              <div className="flex flex-wrap gap-3">
                {step === 0 && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={!selectedAvatarId}
                    className="inline-flex items-center gap-1 px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    Next
                    <ChevronRight size={18} />
                  </button>
                )}

                {step === 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-5 py-2 rounded-lg border border-indigo-300 text-indigo-700 font-medium hover:bg-indigo-50"
                    >
                      Refine with AI (optional)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveProfile(true)}
                      disabled={saving || !selectedAvatarId}
                      className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save profile'}
                    </button>
                  </>
                )}

                {step === 2 && (
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="px-5 py-2 rounded-lg bg-gray-800 text-white font-medium hover:bg-gray-900"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProfessorRoute>
  );
}
