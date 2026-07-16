"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClassDetails } from "@/types/types";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { config } from "@/lib/config";
import { ChevronLeft } from "lucide-react";
import CourseSelector from "./CourseSelector";
import { CourseDetails } from "@/hooks/useCourses";
import { publisherPromptApi, type PromptTemplateResponse } from "@/lib/avatarApi";

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const showSection = false;

function CollapsibleSection({ title, isOpen, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-t-lg bg-muted px-4 py-3 text-left transition-colors hover:bg-muted/80"
      >
        <span className="font-medium text-foreground">{title}</span>
        <span className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
      </button>
      {isOpen && (
        <div className="border-t border-border p-4">{children}</div>
      )}
    </div>
  );
}

export default function ClassCreation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();

  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [, setSelectedCourse] = useState<CourseDetails | null>(null);

  useEffect(() => {
    const courseIdParam = searchParams.get("courseId");
    if (courseIdParam) setSelectedCourseId(courseIdParam);
  }, [searchParams]);

  const [classDetails, setClassDetails] = useState<ClassDetails>({
    className: "",
    courseName: "",
    courseCode: "",
    description: "",
    duration: 75,
    visionInstructions:
      "You are an expert academic content analyst. Extract and describe the complete content of this examination slide for use by an AI oral examiner. Transcribe all text, equations (plain-text notation), code, diagrams (structure, axes, labels, key values), and tables. Be thorough and exact — this content will be used to generate examination questions and evaluate student responses.",
    assistant_parameters: {
      input_audio_format: "pcm16",
      input_audio_noice_reduction: { type: "near_field" },
      input_audio_transcription: { language: "en", model: "whisper-1" },
      instructions: "",
      model: "gpt-realtime-2",
      output_audio_format: "pcm16",
      temperature: 0.8,
      tool_choice: "auto",
      tools: [],
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        silence_duration_ms: 1000,
        prefix_padding_ms: 1000,
        eagerness: "auto",
      },
      voice: "alloy",
    },
  });

  // version2 adds consultation mode; subscriberRuntimeMode is SAE feature kept from local branch
  const [sessionMode, setSessionMode] = useState<"teaching" | "examination" | "consultation">("teaching");
  const [subscriberRuntimeMode, setSubscriberRuntimeMode] = useState<'avatar' | 'chat' | 'choice'>('avatar');

  // Prompt picker (publishers only)
  const [availablePrompts, setAvailablePrompts] = useState<PromptTemplateResponse[]>([]);
  const [selectedPromptTemplateId, setSelectedPromptTemplateId] = useState<string>("");

  const SESSION_MODE_TO_USE_CASE: Record<string, string> = {
    teaching:     'session.teaching',
    examination:  'session.examination',
    consultation: 'session.conversation',
  };

  useEffect(() => {
    if (!token || user?.role !== 'publisher') return;
    const useCase = SESSION_MODE_TO_USE_CASE[sessionMode] ?? 'session.teaching';
    publisherPromptApi.listTemplates(useCase)
      .then(setAvailablePrompts)
      .catch(() => setAvailablePrompts([]));
    setSelectedPromptTemplateId('');
  }, [sessionMode, token, user?.role]);

  const [availableAvatars, setAvailableAvatars] = useState<{ id: string; name: string; template_id: string; template_image_url: string | null }[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>("");
  const [selectedAvatarTemplateId, setSelectedAvatarTemplateId] = useState<string>("");
  const [availableRoles, setAvailableRoles] = useState<{ id: string; name: string; description: string | null; prompt_context: string | null }[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  useEffect(() => {
    if (!token) return;
    fetch(config.getApiUrl("/api/publisher/avatars"), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setAvailableAvatars(data.avatars || []))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!selectedAvatarTemplateId || !token) { setAvailableRoles([]); setSelectedRoleId(""); return; }
    fetch(config.getApiUrl(`/api/publisher/avatar-templates/${selectedAvatarTemplateId}/roles`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setAvailableRoles(Array.isArray(data) ? data : []))
      .catch(() => setAvailableRoles([]));
    setSelectedRoleId("");
  }, [selectedAvatarTemplateId, token]);

  const handleAvatarChange = (avatarId: string) => {
    setSelectedAvatarId(avatarId);
    const avatar = availableAvatars.find((a) => a.id === avatarId);
    setSelectedAvatarTemplateId(avatar?.template_id || "");
  };

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSolutionFile, setSelectedSolutionFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const solutionFileInputRef = useRef<HTMLInputElement>(null);

  // Assessment mode state
  const [sessionSource, setSessionSource] = useState<"upload" | "assessment">("upload");
  type SubmissionRow = { id: string; display_name: string; student_name: string; score: number | null; version_number: number | null; created_at: string | null };
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>("");

  useEffect(() => {
    if (sessionSource !== "assessment" || !token) return;
    fetch(config.getApiUrl("/api/autograder/submissions"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setSubmissions(Array.isArray(data) ? data : []))
      .catch(() => setSubmissions([]));
  }, [sessionSource, token]);

  const handleCourseSelect = (courseId: string, course?: CourseDetails) => {
    setSelectedCourseId(courseId);
    setSelectedCourse(course || null);
    if (course) {
      setClassDetails((prev) => ({ ...prev, courseName: course.name || "", courseCode: course.code || "" }));
    }
  };

  const handleMaterialSelection = (materialId: string, checked: boolean) => {
    setSelectedMaterialIds((prev) =>
      checked ? [...prev, materialId] : prev.filter((id) => id !== materialId)
    );
  };

  const [showAdvancedAudio, setShowAdvancedAudio] = useState(false);
  const [showAdvancedTurnDetection, setShowAdvancedTurnDetection] = useState(false);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);
  const [currentlyPlayingVoice, setCurrentlyPlayingVoice] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const path = e.target.dataset.path || name;
    let parsedValue: any = value;
    if (type === "number") {
      parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) parsedValue = 0;
    } else if (type === "checkbox") {
      parsedValue = (e.target as HTMLInputElement).checked;
    }
    if (name === "duration") parsedValue = parseInt(value, 10);
    if (name === "turn_detection_enabled") {
      const enabled = (e.target as HTMLInputElement).checked;
      setClassDetails((prev) => ({
        ...prev,
        assistant_parameters: {
          ...prev.assistant_parameters,
          turn_detection: enabled
            ? { type: "server_vad", threshold: 0.5, silence_duration_ms: 1000, prefix_padding_ms: 1000, interrupt_response: true, eagerness: "auto", create_response: true }
            : null,
        },
      }));
      return;
    }
    const keys = path.split(".");
    setClassDetails((prev) => {
      const newState = { ...prev };
      let currentLevel: any = newState;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!currentLevel[keys[i]]) currentLevel[keys[i]] = {};
        currentLevel = currentLevel[keys[i]];
      }
      currentLevel[keys[keys.length - 1]] = parsedValue;
      return newState;
    });
  };

  const SUPPORTED_MIME_TYPES = [
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const SUPPORTED_FORMAT_LABEL = "PDF, PPTX, or DOCX";

  const handleFileSelect = (file: File) => {
    if (!SUPPORTED_MIME_TYPES.includes(file.type)) { setError(`Please upload a ${SUPPORTED_FORMAT_LABEL} file`); return; }
    if (file.size > 50 * 1024 * 1024) { setError("File size must be less than 50MB"); return; }
    setSelectedFile(file);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); const files = Array.from(e.dataTransfer.files); if (files.length > 0) handleFileSelect(files[0]); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { const files = e.target.files; if (files && files.length > 0) handleFileSelect(files[0]); };

  const handleSolutionFileSelect = (file: File) => {
    if (!SUPPORTED_MIME_TYPES.includes(file.type)) { setError(`Solution file must be a ${SUPPORTED_FORMAT_LABEL}`); return; }
    if (file.size > 50 * 1024 * 1024) { setError("Solution file size must be less than 50MB"); return; }
    setSelectedSolutionFile(file);
    setError(null);
  };

  const handleSolutionFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleSolutionFileSelect(files[0]);
  };

  const validateForm = (): boolean => {
    if (!selectedCourseId.trim()) { setError("Please select a course"); return false; }
    if (!classDetails.className.trim()) { setError("Class name is required"); return false; }
    if (sessionSource === "upload" && !selectedFile) { setError("Please upload a presentation file"); return false; }
    if (sessionSource === "assessment" && !selectedSubmissionId) { setError("Please select a submission"); return false; }
    if (!classDetails.visionInstructions.trim()) { setError("Vision instructions are required"); return false; }
    return true;
  };

  const [materials, setMaterials] = useState<{ id: string; title: string }[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchMaterials = async () => {
      if (!selectedCourseId) return;
      try {
        const res = await fetch(config.getApiUrl(`/api/course-materials/courses/${selectedCourseId}`), {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Failed to fetch materials");
        const data = await res.json();
        setMaterials(data.materials);
      } catch (err) {
        console.error("Error fetching materials:", err);
      }
    };
    fetchMaterials();
  }, [selectedCourseId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setError(null);
    try {
      const sessionDetails = {
        courseId: selectedCourseId,
        avatarId: selectedAvatarId || null,
        selectedRoleId: selectedRoleId || null,
        className: classDetails.className,
        description: classDetails.description || "",
        duration: classDetails.duration,
        sessionMode,
        visionInstructions: classDetails.visionInstructions,
        assistantParameters: {
          input_audio_format: classDetails.assistant_parameters.input_audio_format,
          input_audio_noise_reduction: classDetails.assistant_parameters.input_audio_noice_reduction,
          input_audio_transcription: classDetails.assistant_parameters.input_audio_transcription,
          instructions: "",
          model: classDetails.assistant_parameters.model,
          output_audio_format: classDetails.assistant_parameters.output_audio_format,
          temperature: classDetails.assistant_parameters.temperature,
          tool_choice: classDetails.assistant_parameters.tool_choice,
          tools: classDetails.assistant_parameters.tools,
          turn_detection: classDetails.assistant_parameters.turn_detection,
          voice: classDetails.assistant_parameters.voice,
        },
        materialId: selectedMaterialIds || null,
        subscriberRuntimeMode,
        promptTemplateId: selectedPromptTemplateId || null,
        source: sessionSource,
        ...(sessionSource === "assessment" ? { submissionId: selectedSubmissionId } : {}),
      };
      const formData = new FormData();
      if (sessionSource === "upload") {
        formData.append("presentation", selectedFile!);
        if (selectedSolutionFile) formData.append("solution_file", selectedSolutionFile);
      }
      formData.append("sessionDetails", JSON.stringify(sessionDetails));
      const response = await fetch(config.getApiUrl("/api/sessions/create"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (response.status === 413) {
        throw new Error("File is too large. Please upload a file under 50MB.");
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || result.error || result.message || "Failed to create session");
      router.push(`/courses/${selectedCourseId}/sessions/${result.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while creating the session");
    } finally {
      setIsLoading(false);
    }
  };

  const defaultTurnDetectionParams = {
    type: "server_vad" as const,
    threshold: 0.5,
    silence_duration_ms: 1000,
    prefix_padding_ms: 1000,
    interrupt_response: true,
    eagerness: "auto" as const,
    create_response: true,
  };

  const playVoiceSample = (voiceName: string) => {
    if (audioPlayerRef.current) {
      if (currentlyPlayingVoice === voiceName) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
        setCurrentlyPlayingVoice(null);
      } else {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
        audioPlayerRef.current.src = `/audio/voice_samples/${voiceName}.flac`;
        audioPlayerRef.current.play()
          .then(() => setCurrentlyPlayingVoice(voiceName))
          .catch(() => { setCurrentlyPlayingVoice(null); setError(`Could not play sample for ${voiceName}.`); });
      }
    }
  };

  useEffect(() => {
    const audioEl = audioPlayerRef.current;
    const handleAudioEnd = () => setCurrentlyPlayingVoice(null);
    if (audioEl) {
      audioEl.addEventListener("ended", handleAudioEnd);
      return () => audioEl.removeEventListener("ended", handleAudioEnd);
    }
  }, []);

  // Shared unselected card classes
  const modeCardBase = "flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-colors";
  const modeCardIdle = "border-border hover:border-primary/40 hover:bg-accent";

  return (
    <ProtectedRoute>
      <audio ref={audioPlayerRef} />
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  const courseIdParam = searchParams.get("courseId");
                  if (courseIdParam) router.push(`/courses/${courseIdParam}`);
                  else router.back();
                }}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <h1 className="text-3xl font-bold text-foreground">Create New Session</h1>
            </div>
            <p className="text-muted-foreground">
              Upload your presentation and configure your AI assistant
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Basic Information */}
            <fieldset className="space-y-4 rounded-lg border border-border p-4">
              <legend className="px-2 text-lg font-semibold text-foreground">
                Basic Information
              </legend>

              <CourseSelector
                selectedCourseId={selectedCourseId}
                onCourseSelect={handleCourseSelect}
                required={true}
                disabled={isLoading}
              />

              <div>
                <label htmlFor="className" className="mb-1 block text-sm font-medium text-foreground">
                  Session Name *
                </label>
                <input
                  type="text"
                  name="className"
                  id="className"
                  value={classDetails.className}
                  onChange={handleInputChange}
                  required
                  className="w-full input-style"
                  placeholder="Introduction to AI — Lecture 1"
                />
                <p className="mt-1 text-xs text-muted-foreground">Name for this specific session</p>
              </div>

              {/* Session Mode */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Session Mode *</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setSessionMode("teaching")}
                    className={`${modeCardBase} ${
                      sessionMode === "teaching"
                        ? "border-primary bg-primary/5"
                        : modeCardIdle
                    }`}
                  >
                    <span className={`text-sm font-semibold ${sessionMode === "teaching" ? "text-primary" : "text-foreground"}`}>
                      📚 Teaching
                    </span>
                    <span className="text-xs leading-relaxed text-muted-foreground">
                      AI guides and explains concepts using the Teaching Prompt.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSessionMode("examination")}
                    className={`${modeCardBase} ${
                      sessionMode === "examination"
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                        : modeCardIdle
                    }`}
                  >
                    <span className={`text-sm font-semibold ${sessionMode === "examination" ? "text-amber-700 dark:text-amber-400" : "text-foreground"}`}>
                      📝 Examination
                    </span>
                    <span className="text-xs leading-relaxed text-muted-foreground">
                      AI assesses and evaluates with strict assessment rules.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSessionMode("consultation")}
                    className={`${modeCardBase} ${
                      sessionMode === "consultation"
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                        : modeCardIdle
                    }`}
                  >
                    <span className={`text-sm font-semibold ${sessionMode === "consultation" ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>
                      💬 Consultation
                    </span>
                    <span className="text-xs leading-relaxed text-muted-foreground">
                      AI acts as an expert advisor — answers questions and gives actionable guidance.
                    </span>
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Determines AI behaviour for the session. Cannot be changed after creation.
                </p>
              </div>

              {/* Subscriber Runtime Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subscriber Experience *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      {
                        value: 'avatar',
                        label: '🎙 Avatar',
                        desc: 'Full realtime voice session with the AI avatar. Premium experience.',
                      },
                      {
                        value: 'chat',
                        label: '💬 Chat',
                        desc: 'Text-based chat with the AI. Lower cost, always available.',
                      },
                      {
                        value: 'choice',
                        label: '⚙ Let Subscriber Choose',
                        desc: 'Subscriber picks avatar or chat when they start a run.',
                      },
                    ] as const
                  ).map(({ value, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSubscriberRuntimeMode(value)}
                      className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-colors ${
                        subscriberRuntimeMode === value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:bg-gray-900'
                      }`}
                    >
                      <span className={`text-sm font-semibold ${subscriberRuntimeMode === value ? 'text-purple-700' : 'text-gray-700 dark:text-gray-300'}`}>
                        {label}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  Controls how subscribers interact with the AI when they join this session.
                </p>
              </div>

              {/* Avatar selection */}
              {availableAvatars.length > 0 && (
                <div>
                  <label htmlFor="avatar_select" className="mb-1 block text-sm font-medium text-foreground">
                    Avatar (Optional)
                  </label>
                  <select
                    id="avatar_select"
                    value={selectedAvatarId}
                    onChange={(e) => handleAvatarChange(e.target.value)}
                    className="w-full input-style"
                  >
                    <option value="">— No avatar —</option>
                    {availableAvatars.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose an avatar to apply its AI persona and enable role selection.
                  </p>
                </div>
              )}

              {/* Role selection */}
              {availableRoles.length > 0 && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Student Role</label>
                  <div className="space-y-2">
                    {availableRoles.map((role) => (
                      <label
                        key={role.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                          selectedRoleId === role.id
                            ? "border-primary/50 bg-primary/5"
                            : "border-border hover:border-primary/30 hover:bg-accent"
                        }`}
                      >
                        <input
                          type="radio"
                          name="session_role"
                          value={role.id}
                          checked={selectedRoleId === role.id}
                          onChange={() => setSelectedRoleId(role.id)}
                          className="mt-0.5 accent-primary"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">{role.name}</p>
                          {role.description && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{role.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">The AI will adapt its behaviour to the selected role.</p>
                </div>
              )}

              {/* Prompt override — publishers only */}
              {user?.role === 'publisher' && availablePrompts.length > 0 && (
                <div>
                  <label htmlFor="prompt_select" className="mb-1 block text-sm font-medium text-foreground">
                    Prompt Override (Optional)
                  </label>
                  <select
                    id="prompt_select"
                    value={selectedPromptTemplateId}
                    onChange={(e) => setSelectedPromptTemplateId(e.target.value)}
                    className="w-full input-style"
                  >
                    <option value="">— Use avatar / system default —</option>
                    {availablePrompts.filter((p) => p.is_system).length > 0 && (
                      <optgroup label="System Defaults">
                        {availablePrompts.filter((p) => p.is_system).map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {availablePrompts.filter((p) => !p.is_system).length > 0 && (
                      <optgroup label="My Prompts">
                        {availablePrompts.filter((p) => !p.is_system).map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Override the AI system prompt for this session only. Leave blank to use the avatar's configured prompt.
                  </p>
                </div>
              )}

              {/* Course materials */}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Attach Course Materials (Optional)
                </label>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/40 p-2">
                  {materials.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`material-${m.id}`}
                        checked={selectedMaterialIds.includes(m.id)}
                        onChange={(e) => handleMaterialSelection(m.id, e.target.checked)}
                        className="accent-primary"
                      />
                      <label htmlFor={`material-${m.id}`} className="text-sm text-foreground">{m.title}</label>
                    </div>
                  ))}
                  {materials.length === 0 && (
                    <p className="text-xs text-muted-foreground">No course materials available.</p>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose existing course materials to include in this session.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="duration" className="mb-1 block text-sm font-medium text-foreground">
                    Duration (minutes)
                  </label>
                  <select name="duration" id="duration" value={classDetails.duration} onChange={handleInputChange} className="w-full input-style">
                    {[30, 45, 60, 75, 90].map((d) => (
                      <option key={d} value={d}>{d} minutes</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="sessionNumber" className="mb-1 block text-sm font-medium text-foreground">
                    Session Number (Optional)
                  </label>
                  <input
                    type="number"
                    name="sessionNumber"
                    id="sessionNumber"
                    className="w-full input-style"
                    placeholder="1"
                    min="1"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Sequential session number</p>
                </div>
              </div>

              <div>
                <label htmlFor="description" className="mb-1 block text-sm font-medium text-foreground">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  id="description"
                  value={classDetails.description || ""}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full input-style"
                  placeholder="Brief overview of this session..."
                />
              </div>
            </fieldset>

            {/* Section 2: Presentation File */}
            <fieldset className="space-y-4 rounded-lg border border-border p-4">
              <legend className="px-2 text-lg font-semibold text-foreground">Presentation File</legend>

              {/* Source toggle */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSessionSource("upload")}
                  className={`${modeCardBase} ${sessionSource === "upload" ? "border-primary bg-primary/5" : modeCardIdle}`}
                >
                  <span className={`text-sm font-semibold ${sessionSource === "upload" ? "text-primary" : "text-foreground"}`}>
                    📎 Upload Files
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">Upload a new presentation PDF or PPTX.</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setSessionSource("assessment"); setSelectedSubmissionId(""); }}
                  className={`${modeCardBase} ${sessionSource === "assessment" ? "border-primary bg-primary/5" : modeCardIdle}`}
                >
                  <span className={`text-sm font-semibold ${sessionSource === "assessment" ? "text-primary" : "text-foreground"}`}>
                    📋 From Assessment
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">Use an existing graded submission as session material.</span>
                </button>
              </div>

              {sessionSource === "upload" ? (
                <>
                  <div
                    className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                      isDragOver
                        ? "border-primary/50 bg-primary/5"
                        : selectedFile
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-accent/50"
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input ref={fileInputRef} type="file" accept=".pdf,.ppt,.pptx,.docx" onChange={handleFileInputChange} className="hidden" />
                    {selectedFile ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-primary">
                          {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                        </p>
                        <button type="button" onClick={() => setSelectedFile(null)} className="text-xs text-destructive hover:underline">
                          Remove file
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Drag & drop or click to browse (up to 50MB)</p>
                        <p className="text-xs text-muted-foreground/60">Supported: PDF, PowerPoint (PPTX), Word (DOCX)</p>
                      </div>
                    )}
                  </div>

                  {/* Solution file */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">
                      Solution File{" "}
                      <span className="font-normal text-muted-foreground">(optional — AI reference only, never shown to student)</span>
                    </label>
                    <div
                      className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                        selectedSolutionFile
                          ? "border-primary/50 bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-accent/50"
                      }`}
                      onClick={() => solutionFileInputRef.current?.click()}
                    >
                      <input ref={solutionFileInputRef} type="file" accept=".pdf,.ppt,.pptx,.docx" onChange={handleSolutionFileInputChange} className="hidden" />
                      {selectedSolutionFile ? (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-primary">
                            {selectedSolutionFile.name} ({(selectedSolutionFile.size / 1024 / 1024).toFixed(1)} MB)
                          </p>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedSolutionFile(null); }}
                            className="text-xs text-destructive hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Click to upload solution file (optional)</p>
                          <p className="text-xs text-muted-foreground/60">Supported: PDF, PPTX, DOCX</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Select Submission *
                  </label>
                  {submissions.length === 0 ? (
                    <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                      No graded submissions found. Submit and grade an assignment first.
                    </p>
                  ) : (
                    <select
                      value={selectedSubmissionId}
                      onChange={(e) => setSelectedSubmissionId(e.target.value)}
                      className="w-full input-style"
                    >
                      <option value="">— Select a submission —</option>
                      {submissions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.display_name || s.student_name}
                          {s.version_number != null ? ` (v${s.version_number})` : ""}
                          {s.score != null ? ` — Score: ${s.score}` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    The student's handwritten work and the question sheet will be loaded as session material. Grading feedback will be injected into the AI's context.
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="visionInstructions" className="mb-1 block text-sm font-medium text-foreground">
                  Vision Model Instructions
                </label>
                <textarea
                  name="visionInstructions"
                  id="visionInstructions"
                  value={classDetails.visionInstructions}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full input-style"
                  placeholder="You are an expert academic content analyst…"
                />
              </div>
            </fieldset>

            {/* Section 3: Core AI Settings */}
            <fieldset className="space-y-4 rounded-lg border border-border p-4">
              <legend className="px-2 text-lg font-semibold text-foreground">Core AI Settings</legend>

              <div>
                <label htmlFor="assistant_parameters.model" className="mb-1 block text-sm font-medium text-foreground">
                  AI Model
                </label>
                <select data-path="assistant_parameters.model" id="assistant_parameters.model" value={classDetails.assistant_parameters.model} onChange={handleInputChange} className="w-full input-style">
                  <option value="gpt-realtime-2">GPT-Realtime-2 (Recommended)</option>
                  <option value="gpt-realtime-mini">GPT-Realtime mini</option>
                  <option value="gpt-realtime">GPT Realtime</option>
                </select>
              </div>

              <div>
                <label htmlFor="assistant_parameters.voice" className="mb-1 block text-sm font-medium text-foreground">
                  Assistant Voice
                </label>
                <div className="flex items-center gap-2">
                  <select data-path="assistant_parameters.voice" id="assistant_parameters.voice" value={classDetails.assistant_parameters.voice} onChange={handleInputChange} className="flex-grow input-style">
                    {["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"].map((v) => (
                      <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => playVoiceSample(classDetails.assistant_parameters.voice)}
                    className="rounded-lg border border-input p-2 transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label={`Preview voice ${classDetails.assistant_parameters.voice}`}
                  >
                    {currentlyPlayingVoice === classDetails.assistant_parameters.voice ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-destructive">
                        <path d="M6 6h12v12H6z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-primary">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="assistant_parameters.temperature" className="mb-1 block text-sm font-medium text-foreground">
                  Temperature (Creativity): {classDetails.assistant_parameters.temperature}
                </label>
                <input
                  type="range"
                  data-path="assistant_parameters.temperature"
                  id="assistant_parameters.temperature"
                  value={classDetails.assistant_parameters.temperature}
                  onChange={handleInputChange}
                  min="0.6"
                  max="1.2"
                  step="0.1"
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                />
              </div>
            </fieldset>

            {/* Advanced sections (hidden by default via showSection flag) */}
            {showSection && (
              <CollapsibleSection title="Advanced Tool Settings" isOpen={showAdvancedTools} onToggle={() => setShowAdvancedTools(!showAdvancedTools)}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="assistant_parameters.tool_choice" className="mb-1 block text-sm font-medium text-foreground">Tool Choice</label>
                    <select data-path="assistant_parameters.tool_choice" id="assistant_parameters.tool_choice" value={classDetails.assistant_parameters.tool_choice} onChange={handleInputChange} className="w-full input-style">
                      <option value="auto">Auto</option>
                      <option value="none">None</option>
                      <option value="required">Required</option>
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">Controls if/how the model uses tools.</p>
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {showSection && (
              <CollapsibleSection title="Advanced Audio Settings" isOpen={showAdvancedAudio} onToggle={() => setShowAdvancedAudio(!showAdvancedAudio)}>
                <div className="space-y-6">
                  <h4 className="border-b border-border pb-1 text-base font-semibold text-foreground">Input Audio</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="assistant_parameters.input_audio_format" className="mb-1 block text-sm font-medium text-foreground">Format</label>
                      <select data-path="assistant_parameters.input_audio_format" id="assistant_parameters.input_audio_format" value={classDetails.assistant_parameters.input_audio_format} onChange={handleInputChange} className="w-full input-style">
                        {["pcm16", "g711_ulaw", "g711_alaw"].map((f) => (<option key={f} value={f}>{f}</option>))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="assistant_parameters.input_audio_noice_reduction.type" className="mb-1 block text-sm font-medium text-foreground">Noise Reduction</label>
                      <select data-path="assistant_parameters.input_audio_noice_reduction.type" id="assistant_parameters.input_audio_noice_reduction.type" value={classDetails.assistant_parameters.input_audio_noice_reduction.type} onChange={handleInputChange} className="w-full input-style">
                        <option value="near_field">Near Field</option>
                        <option value="far_field">Far Field</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="assistant_parameters.input_audio_transcription.model" className="mb-1 block text-sm font-medium text-foreground">Transcription Model</label>
                      <select data-path="assistant_parameters.input_audio_transcription.model" id="assistant_parameters.input_audio_transcription.model" value={classDetails.assistant_parameters.input_audio_transcription.model} onChange={handleInputChange} className="w-full input-style">
                        <option value="whisper-1">Whisper-1</option>
                        <option value="gpt-4o-transcribe">GPT-4o Transcribe</option>
                        <option value="gpt-4o-mini-transcribe">GPT-4o Mini Transcribe</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="assistant_parameters.input_audio_transcription.language" className="mb-1 block text-sm font-medium text-foreground">Language</label>
                      <input type="text" data-path="assistant_parameters.input_audio_transcription.language" id="assistant_parameters.input_audio_transcription.language" value={classDetails.assistant_parameters.input_audio_transcription.language} onChange={handleInputChange} className="w-full input-style" placeholder="e.g., en, es, fr" />
                      <p className="mt-1 text-xs text-muted-foreground">ISO 639-1 code (e.g., en for English).</p>
                    </div>
                  </div>
                  <h4 className="mt-4 border-b border-border pb-1 text-base font-semibold text-foreground">Output Audio</h4>
                  <div>
                    <label htmlFor="assistant_parameters.output_audio_format" className="mb-1 block text-sm font-medium text-foreground">Format</label>
                    <select data-path="assistant_parameters.output_audio_format" id="assistant_parameters.output_audio_format" value={classDetails.assistant_parameters.output_audio_format} onChange={handleInputChange} className="w-full input-style">
                      {["pcm16", "g711_ulaw", "g711_alaw"].map((f) => (<option key={f} value={f}>{f}</option>))}
                    </select>
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {showSection && (
              <CollapsibleSection title="Advanced Turn Detection" isOpen={showAdvancedTurnDetection} onToggle={() => setShowAdvancedTurnDetection(!showAdvancedTurnDetection)}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="turn_detection_type" className="mb-1 block text-sm font-medium text-foreground">Turn Detection Type</label>
                    <select
                      id="turn_detection_type"
                      value={classDetails.assistant_parameters.turn_detection?.type || "none"}
                      onChange={(e) => {
                        const type = e.target.value;
                        if (type === "none") {
                          setClassDetails((prev) => ({ ...prev, assistant_parameters: { ...prev.assistant_parameters, turn_detection: null } }));
                        } else {
                          setClassDetails((prev) => ({ ...prev, assistant_parameters: { ...prev.assistant_parameters, turn_detection: { ...defaultTurnDetectionParams, type: type as "server_vad" | "semantic_vad" } } }));
                        }
                      }}
                      className="w-full input-style"
                    >
                      <option value="none">None (Manual)</option>
                      <option value="server_vad">Server VAD</option>
                      <option value="semantic_vad">Semantic VAD</option>
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">How the AI detects when users stop speaking</p>
                  </div>
                  {classDetails.assistant_parameters.turn_detection?.type === "server_vad" && (
                    <>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label htmlFor="assistant_parameters.turn_detection.threshold" className="mb-1 block text-sm font-medium text-foreground">
                            Threshold ({classDetails.assistant_parameters.turn_detection.threshold})
                          </label>
                          <input type="range" data-path="assistant_parameters.turn_detection.threshold" id="assistant_parameters.turn_detection.threshold" value={classDetails.assistant_parameters.turn_detection.threshold} onChange={handleInputChange} min="0.0" max="1.0" step="0.1" className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary" />
                        </div>
                        <div>
                          <label htmlFor="assistant_parameters.turn_detection.silence_duration_ms" className="mb-1 block text-sm font-medium text-foreground">Silence Duration (ms)</label>
                          <input type="number" data-path="assistant_parameters.turn_detection.silence_duration_ms" id="assistant_parameters.turn_detection.silence_duration_ms" value={classDetails.assistant_parameters.turn_detection.silence_duration_ms} onChange={handleInputChange} className="w-full input-style" placeholder="e.g., 1000" />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="assistant_parameters.turn_detection.prefix_padding_ms" className="mb-1 block text-sm font-medium text-foreground">Prefix Padding (ms)</label>
                        <input type="number" data-path="assistant_parameters.turn_detection.prefix_padding_ms" id="assistant_parameters.turn_detection.prefix_padding_ms" value={classDetails.assistant_parameters.turn_detection.prefix_padding_ms} onChange={handleInputChange} className="w-full input-style" placeholder="e.g., 300" />
                      </div>
                    </>
                  )}
                  {classDetails.assistant_parameters.turn_detection?.type === "semantic_vad" && (
                    <div>
                      <label htmlFor="assistant_parameters.turn_detection.eagerness" className="mb-1 block text-sm font-medium text-foreground">Eagerness</label>
                      <select data-path="assistant_parameters.turn_detection.eagerness" id="assistant_parameters.turn_detection.eagerness" value={classDetails.assistant_parameters.turn_detection.eagerness} onChange={handleInputChange} className="w-full input-style">
                        <option value="low">Low</option>
                        <option value="auto">Auto</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-primary px-4 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-primary-foreground" />
                  Processing & Summoning Sidekick...
                </div>
              ) : (
                "Summon Your Sidekick"
              )}
            </button>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
