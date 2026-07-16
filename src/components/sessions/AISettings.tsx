'use client';

import React, { useState, useEffect } from 'react';
import { config } from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';
import PromptLibrary from './PromptLibrary';

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}
 
function CollapsibleSection({ title, isOpen, onToggle, children }: CollapsibleSectionProps) {
  return (
    <fieldset className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <legend 
        className="text-lg font-semibold text-primary/95 dark:text-primary/30 px-2 cursor-pointer flex items-center gap-2"
        onClick={onToggle}
      >
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {title}
      </legend>
      {isOpen && children}
    </fieldset>
  );
}

interface AISettingsProps {
  sessionId: string;
  onClose: () => void;
}

export default function AISettings({ sessionId, onClose }: AISettingsProps) {
  const { token } = useAuth();
  const [settings, setSettings] = useState({
    model: "gpt-realtime-2",
    voice: "alloy",
    temperature: 0.8,
    instructions: "",
    user_instructions: "",
    tool_choice: "auto",
    input_audio_format: "pcm16",
    input_audio_noise_reduction: {
      type: "near_field"
    },
    input_audio_transcription: {
      model: "whisper-1",
      language: "en"
    },
    output_audio_format: "pcm16",
    turn_detection: null as any
  });

  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [showAdvancedAudio, setShowAdvancedAudio] = useState(false);
  const [showAdvancedTurnDetection, setShowAdvancedTurnDetection] = useState(false);
  const [showSessionBehavior, setShowSessionBehavior] = useState(false);
  const [sessionBehavior, setSessionBehavior] = useState({
    hintPolicy: "NONE" as "NONE" | "FREE" | "PENALIZED",
    rubric: [] as Array<{ criterion: string; weight: number }>,
    sessionInstructions: "",
  });
  const [sessionBehaviorRubricInput, setSessionBehaviorRubricInput] = useState("[]");
  const [sessionBehaviorRubricError, setSessionBehaviorRubricError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentlyPlayingVoice, setCurrentlyPlayingVoice] = useState<string | null>(null);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);

  const defaultTurnDetectionParams = {
    type: "server_vad",
    threshold: 0.5,
    silence_duration_ms: 1000,
    prefix_padding_ms: 300,
    eagerness: "auto"
  };

  // Function to get system instructions (stored in JSON structure)
//   const getSystemInstructions = () => {
//     return `You are ProfSidekick, an AI teaching assistant for interactive classroom presentations.

// CORE FUNCTIONALITY:
// - Navigate slides using nextSlide(), previousSlide(), and goToSlide(slideNumber) functions
// - Receive real-time notifications when users manually change slides via [SLIDE CHANGE] messages
// - Provide clear explanations and engage with students during presentations
// - Stay interruptible and responsive to student questions at any time

// TEACHING BEHAVIOR:
// - Speak clearly and enthusiastically like a knowledgeable instructor
// - Reference specific slide numbers when discussing content
// - Pause and listen for student interruptions (questions, requests for clarification)
// - Adapt explanations to student comprehension levels
// - Encourage student participation and questions

// SLIDE NAVIGATION:
// - Use slide functions to control presentation flow
// - Acknowledge slide changes naturally when notified
// - Stay aware of current slide position and total slide count
// - Wait for user input before automatically advancing slides

// Additional custom instructions will be provided separately.`;
//   };

  useEffect(() => {
    fetchSessionSettings();
  }, [sessionId]);

  const fetchSessionSettings = async () => {
    try {
      const response = await fetch(config.getApiUrl(`/api/sessions/${sessionId}`));
      if (response.ok) {
        const sessionData = await response.json();
        // Backend returns assistantParameters (camelCase), not assistant_parameters
        if (sessionData.assistantParameters) {
          const params = sessionData.assistantParameters;
          
          // Parse instructions (JSON format or legacy string format)
          let userInstructions = "";
          const instructionsStr = params.instructions || "";

          try {
            // Try to parse as JSON first (new format)
            const structuredInstructions = JSON.parse(instructionsStr);
            if (structuredInstructions && typeof structuredInstructions === 'object') {
              userInstructions = structuredInstructions.editable || "";
              // Fix 6: "core" field is not loaded — it is ignored by the backend (prompt_builder.py
              // always uses EXAMINER_BASE_PROMPT). Existing DB rows may contain "core" but it has
              // no effect and is no longer stored on save.
              console.log("✅ Loaded structured instructions (JSON format)");

              // Load sessionBehavior if present
              if (structuredInstructions.sessionBehavior) {
                const sb = structuredInstructions.sessionBehavior;
                const loadedBehavior = {
                  hintPolicy: (sb.hintPolicy || "NONE") as "NONE" | "FREE" | "PENALIZED",
                  rubric: Array.isArray(sb.rubric) ? sb.rubric : [],
                  sessionInstructions: sb.sessionInstructions || "",
                };
                setSessionBehavior(loadedBehavior);
                setSessionBehaviorRubricInput(JSON.stringify(loadedBehavior.rubric, null, 2));
              }
            }
          } catch (err) {
            console.error('Error parsing instructions:', err);
            // Fallback to legacy string parsing
            console.log("📄 Parsing legacy instructions format");
            if (instructionsStr.includes("--- CUSTOM INSTRUCTIONS ---")) {
              const parts = instructionsStr.split("--- CUSTOM INSTRUCTIONS ---");
              userInstructions = parts[1]?.trim() || "";
            } else if (instructionsStr && !instructionsStr.includes("ProfSidekick")) {
              // If it's not system instructions, treat as user instructions
              userInstructions = instructionsStr;
            }
          }
          
          setSettings({
            ...params,
            user_instructions: userInstructions,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching session settings:', error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const path = e.target.getAttribute('data-path') || name;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setSettings(prev => ({
        ...prev,
        [path]: checked
      }));
      return;
    }

    if (path.includes('.')) {
      const keys = path.split('.');
      setSettings(prev => {
        const newSettings = { ...prev };
        let current = newSettings as any;
        
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }
        
        const finalKey = keys[keys.length - 1];
        current[finalKey] = type === 'number' || type === 'range' ? parseFloat(value) : value;
        
        return newSettings;
      });
    } else {
      setSettings(prev => ({
        ...prev,
        [path]: type === 'number' || type === 'range' ? parseFloat(value) : value
      }));
    }
  };

  const playVoiceSample = (voiceName: string) => {
    if (currentlyPlayingVoice === voiceName) {
      setCurrentlyPlayingVoice(null);
      return;
    }
    
    setCurrentlyPlayingVoice(voiceName);
    const audio = new Audio(`/audio/voice_samples/${voiceName}.flac`);
    audio.play().catch(console.error);
    
    const handleAudioEnd = () => setCurrentlyPlayingVoice(null);
    audio.addEventListener('ended', handleAudioEnd);
    audio.addEventListener('error', handleAudioEnd);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionBehaviorRubricError) return;
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Check if user is authenticated
      if (!token) {
        throw new Error('Authentication required');
      }

      // Saves rubric, hint policy, and professor instructions to backend.
      // The examiner base prompt is assembled server-side in prompt_builder.py at token-generation time.
      // Fix 6: "core" is omitted — it was stored but silently ignored by the backend.
      const structuredInstructions = {
        version: "1.0",
        editable: settings.user_instructions || "",
        sessionBehavior: {
          hintPolicy: sessionBehavior.hintPolicy,
          rubric: sessionBehavior.rubric,
          sessionInstructions: sessionBehavior.sessionInstructions,
        },
        timestamp: new Date().toISOString()
      };
      
      // Prepare settings with JSON instructions
      const settingsToSend = {
        ...settings,
        instructions: JSON.stringify(structuredInstructions)
      };
      
      // Remove user_instructions from what we send to backend (it's now combined in instructions)
      delete (settingsToSend as any).user_instructions;

      const response = await fetch(config.getApiUrl(`/api/sessions/${sessionId}/update`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          assistantParameters: settingsToSend
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update AI settings: ${response.statusText}`);
      }

      // Show success message
      setSuccess('AI settings updated successfully!');
      
      // Close modal after a short delay to show the success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error updating AI settings:', error);
      setError(error instanceof Error ? error.message : 'Failed to update AI settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:bg-gray-800 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Core AI Settings */}
          <fieldset className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <legend className="text-lg font-semibold text-primary/95 dark:text-primary/30 px-2">Core AI Settings</legend>
            
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">AI Model</label>
              <input
                type="text"
                value="GPT Realtime"
                readOnly
                className="w-full p-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-lg text-gray-600 dark:text-gray-400"
              />
            </div>

            <div>
              <label htmlFor="voice" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assistant Voice</label>
              <div className="flex items-center gap-2">
                <select 
                  data-path="voice" 
                  id="voice" 
                  value={settings.voice} 
                  onChange={handleInputChange} 
                  className="flex-grow p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50"
                >
                  {["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"].map(v => 
                    <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                  )}
                </select>
                <button 
                  type="button" 
                  onClick={() => playVoiceSample(settings.voice)} 
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50"
                  aria-label={`Preview voice ${settings.voice}`}
                >
                  {currentlyPlayingVoice === settings.voice ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-600">
                      <path d="M6 6h12v12H6z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-primary/90 dark:text-primary/40">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Temperature (Creativity): {settings.temperature}
              </label>
              <input 
                type="range" 
                data-path="temperature" 
                id="temperature" 
                value={settings.temperature} 
                onChange={handleInputChange} 
                min="0.6" 
                max="1.2" 
                step="0.1" 
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" 
              />
            </div>

            {/* User-Editable Instructions */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="user_instructions" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Custom Teaching Instructions
                </label>
                <button
                  type="button"
                  onClick={() => setShowPromptLibrary(true)}
                  className="px-3 py-1 text-sm bg-primary/10 dark:bg-primary/40 hover:bg-primary/20 dark:bg-primary/60 text-primary/95 dark:text-primary/30 rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Browse Prompts
                </button>
              </div>
              <textarea 
                data-path="user_instructions" 
                id="user_instructions" 
                value={settings.user_instructions || ""} 
                onChange={handleInputChange} 
                rows={4} 
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50" 
                placeholder="Add custom examination instructions, question strategies, or subject-specific behavior..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Customize how the AI examiner should conduct this session. Combined with the core examiner instructions below.
              </p>
            </div>

          </fieldset>

          {/* Session Behavior */}
          <CollapsibleSection
            title="Session Behavior"
            isOpen={showSessionBehavior}
            onToggle={() => setShowSessionBehavior(!showSessionBehavior)}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hint Policy</label>
                <select
                  value={sessionBehavior.hintPolicy}
                  onChange={(e) => setSessionBehavior(prev => ({ ...prev, hintPolicy: e.target.value as "NONE" | "FREE" | "PENALIZED" }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50"
                >
                  <option value="NONE">None — no hints offered</option>
                  <option value="FREE">Free — hints given freely</option>
                  <option value="PENALIZED">Penalized — hints reduce score</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Controls whether the AI offers hints and how they affect scoring.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rubric (JSON array)</label>
                <textarea
                  value={sessionBehaviorRubricInput}
                  onChange={(e) => {
                    setSessionBehaviorRubricInput(e.target.value);
                    try {
                      const parsed = JSON.parse(e.target.value);
                      if (Array.isArray(parsed)) {
                        const total = parsed.reduce((sum: number, r: any) => sum + (Number(r.weight) || 0), 0);
                        if (parsed.length > 0 && total !== 100) {
                          setSessionBehaviorRubricError(`Weights must sum to 100 (currently ${total})`);
                        } else {
                          setSessionBehavior(prev => ({ ...prev, rubric: parsed }));
                          setSessionBehaviorRubricError("");
                        }
                      } else {
                        setSessionBehaviorRubricError("Must be a JSON array");
                      }
                    } catch {
                      setSessionBehaviorRubricError("Invalid JSON");
                    }
                  }}
                  rows={5}
                  className={`w-full p-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50 ${sessionBehaviorRubricError ? "border-red-400" : "border-gray-300"}`}
                  placeholder={'[\n  { "criterion": "Understanding", "weight": 40 },\n  { "criterion": "Clarity", "weight": 60 }\n]'}
                />
                {sessionBehaviorRubricError && <p className="text-xs text-red-500 mt-1">{sessionBehaviorRubricError}</p>}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Grading criteria and weights injected into the AI prompt at session start.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Session-Specific Instructions</label>
                <textarea
                  value={sessionBehavior.sessionInstructions}
                  onChange={(e) => setSessionBehavior(prev => ({ ...prev, sessionInstructions: e.target.value }))}
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50"
                  placeholder="e.g. Focus on Chapter 5 material only. Ask follow-up questions if the student is vague."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Extra behavioral instructions appended to the prompt for this session.</p>
              </div>
            </div>
          </CollapsibleSection>

          {/* Advanced Settings */}
          <CollapsibleSection
            title="Advanced Tool Settings"
            isOpen={showAdvancedTools} 
            onToggle={() => setShowAdvancedTools(!showAdvancedTools)}
          >
            <div>
              <label htmlFor="tool_choice" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tool Choice</label>
              <select 
                data-path="tool_choice" 
                id="tool_choice" 
                value={settings.tool_choice} 
                onChange={handleInputChange} 
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50"
              >
                <option value="auto">Auto</option>
                <option value="none">None</option>
                <option value="required">Required</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Controls if/how the model uses tools. Tools array itself is pre-configured.
              </p>
            </div>
          </CollapsibleSection>

          <CollapsibleSection 
            title="Advanced Audio Settings" 
            isOpen={showAdvancedAudio} 
            onToggle={() => setShowAdvancedAudio(!showAdvancedAudio)}
          >
            <div className="space-y-6">
              <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 border-b pb-1">Input Audio</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="input_audio_format" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Format</label>
                  <select 
                    data-path="input_audio_format" 
                    id="input_audio_format" 
                    value={settings.input_audio_format} 
                    onChange={handleInputChange} 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50"
                  >
                    {["pcm16", "g711_ulaw", "g711_alaw"].map(f => 
                      <option key={f} value={f}>{f}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label htmlFor="input_audio_noise_reduction.type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Noise Reduction Type</label>
                  <select
                    data-path="input_audio_noise_reduction.type"
                    id="input_audio_noise_reduction.type"
                    value={settings.input_audio_noise_reduction?.type || "near_field"}
                    onChange={handleInputChange} 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50"
                  >
                    <option value="near_field">Near Field</option>
                    <option value="far_field">Far Field</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="input_audio_transcription.model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transcription Model</label>
                  <select 
                    data-path="input_audio_transcription.model" 
                    id="input_audio_transcription.model" 
                    value={settings.input_audio_transcription?.model || "whisper-1"} 
                    onChange={handleInputChange} 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50"
                  >
                    <option value="whisper-1">Whisper-1</option>
                    <option value="gpt-4o-transcribe">GPT-4o Transcribe</option>
                    <option value="gpt-4o-mini-transcribe">GPT-4o Mini Transcribe</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="input_audio_transcription.language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transcription Language</label>
                  <input 
                    type="text" 
                    data-path="input_audio_transcription.language" 
                    id="input_audio_transcription.language" 
                    value={settings.input_audio_transcription?.language || "en"} 
                    onChange={handleInputChange} 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50" 
                    placeholder="e.g., en, es, fr" 
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ISO 639-1 code (e.g., en for English).</p>
                </div>
              </div>

              <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 border-b pb-1 mt-4">Output Audio</h4>
              <div>
                <label htmlFor="output_audio_format" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Format</label>
                <select 
                  data-path="output_audio_format" 
                  id="output_audio_format" 
                  value={settings.output_audio_format} 
                  onChange={handleInputChange} 
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50"
                >
                  {["pcm16", "g711_ulaw", "g711_alaw"].map(f => 
                    <option key={f} value={f}>{f}</option>
                  )}
                </select>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection 
            title="Advanced Turn Detection Settings" 
            isOpen={showAdvancedTurnDetection} 
            onToggle={() => setShowAdvancedTurnDetection(!showAdvancedTurnDetection)}
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="turn_detection_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turn Detection Type</label>
                <select 
                  id="turn_detection_type" 
                  value={settings.turn_detection?.type || 'none'} 
                  onChange={(e) => {
                    const type = e.target.value;
                    if (type === 'none') {
                      setSettings(prev => ({
                        ...prev,
                        turn_detection: null,
                      }));
                    } else {
                      setSettings(prev => ({
                        ...prev,
                        turn_detection: {
                          ...defaultTurnDetectionParams,
                          type: type,
                        },
                      }));
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50"
                >
                  <option value="none">None (Manual)</option>
                  <option value="server_vad">Server VAD</option>
                  <option value="semantic_vad">Semantic VAD</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Choose how the AI detects when users stop speaking
                </p>
              </div>

              {settings.turn_detection?.type === "server_vad" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="turn_detection.threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Threshold ({settings.turn_detection.threshold})
                      </label>
                      <input 
                        type="range" 
                        data-path="turn_detection.threshold" 
                        id="turn_detection.threshold" 
                        value={settings.turn_detection.threshold} 
                        onChange={handleInputChange} 
                        min="0.0" 
                        max="1.0" 
                        step="0.1" 
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" 
                      />
                    </div>
                    <div>
                      <label htmlFor="turn_detection.silence_duration_ms" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Silence Duration (ms)</label>
                      <input 
                        type="number" 
                        data-path="turn_detection.silence_duration_ms" 
                        id="turn_detection.silence_duration_ms" 
                        value={settings.turn_detection.silence_duration_ms} 
                        onChange={handleInputChange} 
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50" 
                        placeholder="e.g., 1000" 
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="turn_detection.prefix_padding_ms" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prefix Padding (ms)</label>
                    <input 
                      type="number" 
                      data-path="turn_detection.prefix_padding_ms" 
                      id="turn_detection.prefix_padding_ms" 
                      value={settings.turn_detection.prefix_padding_ms} 
                      onChange={handleInputChange} 
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50" 
                      placeholder="e.g., 300" 
                    />
                  </div>
                </>
              )}

              {settings.turn_detection?.type === "semantic_vad" && (
                <div>
                  <label htmlFor="turn_detection.eagerness" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Eagerness</label>
                  <select 
                    data-path="turn_detection.eagerness" 
                    id="turn_detection.eagerness" 
                    value={settings.turn_detection.eagerness} 
                    onChange={handleInputChange} 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50"
                  >
                    <option value="low">Low</option>
                    <option value="auto">Auto</option>
                    <option value="high">High</option>
                  </select>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Error and Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-sm text-primary">{success}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-primary dark:bg-primary/90 text-white rounded-lg hover:bg-primary/90 dark:hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Prompt Library Modal */}
      {showPromptLibrary && (
        <PromptLibrary
          currentInstructions={settings.user_instructions || ""}
          onSelectPrompt={(content) => {
            setSettings(prev => ({
              ...prev,
              user_instructions: content
            }));
          }}
          onClose={() => setShowPromptLibrary(false)}
        />
      )}
    </div>
  );
}
