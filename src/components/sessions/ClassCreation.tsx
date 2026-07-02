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

// Helper component for collapsible sections 
interface CollapsibleSectionProps { 
  title: string; 
  isOpen: boolean; 
  onToggle: () => void; 
  children: React.ReactNode; 
} 

const showSection = false; 

function CollapsibleSection({ title, isOpen, onToggle, children }: CollapsibleSectionProps) { 
  return ( 
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg"> 
    <button 
      type="button" 
      onClick={onToggle} 
      className="w-full px-4 py-3 text-left flex justify-between items-center bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:bg-gray-800 rounded-t-lg transition-colors" 
    > 
      <span className="font-medium text-gray-700 dark:text-gray-300">{title}</span> 
      <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}> 
      ▼ 
      </span> 
    </button> 
    {isOpen && ( 
      <div className="p-4 border-t border-gray-200 dark:border-gray-700"> 
        {children} 
      </div> 
    )} 
    </div> 
  ); 
} 


export default function ClassCreation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();

  // const [, setDefaultPrompt] = useState("");

  // Course selection state
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [, setSelectedCourse] = useState<CourseDetails | null>(null);

  // Check for courseId URL parameter to pre-select course
  useEffect(() => {
    const courseIdParam = searchParams.get("courseId");
    if (courseIdParam) {
      setSelectedCourseId(courseIdParam);
    }
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
      input_audio_noice_reduction: {
        type: "near_field",
      },
      input_audio_transcription: {
        language: "en",
        model: "whisper-1",
      },
      instructions: "",
      model: "gpt-4o-realtime-preview-2024-12-17",
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

  const [sessionMode, setSessionMode] = useState<'teaching' | 'examination'>('teaching');
  const [subscriberRuntimeMode, setSubscriberRuntimeMode] = useState<'avatar' | 'chat' | 'choice'>('avatar');

  // Avatar + role selection
  const [availableAvatars, setAvailableAvatars] = useState<{ id: string; name: string; template_id: string; template_image_url: string | null }[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('');
  const [selectedAvatarTemplateId, setSelectedAvatarTemplateId] = useState<string>('');
  const [availableRoles, setAvailableRoles] = useState<{ id: string; name: string; description: string | null; prompt_context: string | null }[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  useEffect(() => {
    if (!token) return;
    fetch(config.getApiUrl('/api/publisher/avatars'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setAvailableAvatars(data.avatars || []))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!selectedAvatarTemplateId || !token) { setAvailableRoles([]); setSelectedRoleId(''); return; }
    fetch(config.getApiUrl(`/api/publisher/avatar-templates/${selectedAvatarTemplateId}/roles`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setAvailableRoles(Array.isArray(data) ? data : []))
      .catch(() => setAvailableRoles([]));
    setSelectedRoleId('');
  }, [selectedAvatarTemplateId, token]);

  const handleAvatarChange = (avatarId: string) => {
    setSelectedAvatarId(avatarId);
    const avatar = availableAvatars.find((a) => a.id === avatarId);
    setSelectedAvatarTemplateId(avatar?.template_id || '');
  };

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSolutionFile, setSelectedSolutionFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const solutionFileInputRef = useRef<HTMLInputElement>(null);

  // Handle course selection
  const handleCourseSelect = (courseId: string, course?: CourseDetails) => {
    setSelectedCourseId(courseId);
    setSelectedCourse(course || null);

    // Update class details with course info for legacy compatibility
    if (course) {
      setClassDetails((prev) => ({
        ...prev,
        courseName: course.name || "",
        courseCode: course.code || "",
      }));
    }
  };

  const handleMaterialSelection = (materialId: string, checked: boolean) => {
    setSelectedMaterialIds(prev =>
      checked ? [...prev, materialId] : prev.filter(id => id !== materialId)
    );
  };


  // State for managing visibility of advanced sections
  const [showAdvancedAudio, setShowAdvancedAudio] = useState(false);
  const [showAdvancedTurnDetection, setShowAdvancedTurnDetection] =
    useState(false);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);

  const audioPlayerRef = useRef<HTMLAudioElement>(null);
  const [currentlyPlayingVoice, setCurrentlyPlayingVoice] = useState<
    string | null
  >(null);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const path = e.target.dataset.path || name;

    let parsedValue: any = value;
    if (type === "number") {
      parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) {
        parsedValue = 0; // Or handle error, or keep as string if appropriate
      }
    } else if (type === "checkbox") {
      parsedValue = (e.target as HTMLInputElement).checked;
    }

    // Handle specific known number or boolean fields that don't have type="number/checkbox"
    // For example, duration is a top-level prop.
    if (name === "duration") {
      parsedValue = parseInt(value, 10);
    }

    // For turn_detection enable/disable
    if (name === "turn_detection_enabled") {
      const enabled = (e.target as HTMLInputElement).checked;
      setClassDetails((prev) => ({
        ...prev,
        assistant_parameters: {
          ...prev.assistant_parameters,
          turn_detection: enabled
            ? {
                type: "server_vad", // Default values when re-enabled
                threshold: 0.5,
                silence_duration_ms: 1000,
                prefix_padding_ms: 1000,
                interrupt_response: true,
                eagerness: "auto",
                create_response: true,
              }
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
        if (!currentLevel[keys[i]]) {
          currentLevel[keys[i]] = {};
        }
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
    if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
      setError(`Please upload a ${SUPPORTED_FORMAT_LABEL} file`);
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      setError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 30 MB.`);
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleSolutionFileSelect = (file: File) => {
    if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
      setError(`Solution file must be a ${SUPPORTED_FORMAT_LABEL}`);
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setError(`Solution file is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 30 MB.`);
      return;
    }
    setSelectedSolutionFile(file);
    setError(null);
  };

  const handleSolutionFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleSolutionFileSelect(files[0]);
    }
  };

  const validateForm = (): boolean => {
    if (!selectedCourseId.trim()) {
      setError("Please select a course");
      return false;
    }
    if (!classDetails.className.trim()) {
      setError("Class name is required");
      return false;
    }
    if (!selectedFile) {
      setError("Please upload a presentation file");
      return false;
    }
    return true;
  };


  // To allow attaching course materials to the session
  const [materials, setMaterials] = useState<{ id: string; title: string }[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchMaterials = async () => {
      if (!selectedCourseId) return;
      try {
        const res = await fetch(
          config.getApiUrl(`/api/course-materials/courses/${selectedCourseId}`),
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch materials");
        const data = await res.json();
        setMaterials(data.materials); // this is an array
      } catch (err) {
        console.error("Error fetching materials:", err);
      }
    };
    fetchMaterials();
  }, [selectedCourseId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      // Transform classDetails to sessionDetails format for backend
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
          input_audio_format:
            classDetails.assistant_parameters.input_audio_format,
          input_audio_noise_reduction:
            classDetails.assistant_parameters.input_audio_noice_reduction,
          input_audio_transcription:
            classDetails.assistant_parameters.input_audio_transcription,
          instructions: "",
          model: classDetails.assistant_parameters.model,
          output_audio_format:
            classDetails.assistant_parameters.output_audio_format,
          temperature: classDetails.assistant_parameters.temperature,
          tool_choice: classDetails.assistant_parameters.tool_choice,
          tools: classDetails.assistant_parameters.tools,
          turn_detection: classDetails.assistant_parameters.turn_detection,
          voice: classDetails.assistant_parameters.voice,
        },
        materialId: selectedMaterialIds || null,
        subscriberRuntimeMode,
      };

      const formData = new FormData();
      formData.append("presentation", selectedFile!);
      if (selectedSolutionFile) {
        formData.append("solution_file", selectedSolutionFile);
      }
      formData.append("sessionDetails", JSON.stringify(sessionDetails));

      const response = await fetch(config.getApiUrl("/api/sessions/create"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.status === 413) {
        throw new Error("File is too large. Please upload a file under 30 MB.");
      }
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.detail || result.message || result.error || "Failed to create session"
        );
      }

      // Redirect to the session overview page using new nested URL structure
      router.push(`/courses/${selectedCourseId}/sessions/${result.sessionId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while creating the session"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Default values for turn_detection when it's enabled
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
        // Stop any currently playing sample first
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
        audioPlayerRef.current.src = `/audio/voice_samples/${voiceName}.flac`;
        audioPlayerRef.current
          .play()
          .then(() => {
            setCurrentlyPlayingVoice(voiceName);
          })
          .catch((err) => {
            console.error("Error playing audio:", err);
            setCurrentlyPlayingVoice(null); // Reset if error
            setError(
              `Could not play sample for ${voiceName}. Ensure audio files are in /public/audio/voice_samples/`
            );
          });
      }
    }
  };




  useEffect(() => {
    const audioEl = audioPlayerRef.current;
    const handleAudioEnd = () => setCurrentlyPlayingVoice(null);
    if (audioEl) {
      audioEl.addEventListener("ended", handleAudioEnd);
      return () => {
        audioEl.removeEventListener("ended", handleAudioEnd);
      };
    }
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <audio ref={audioPlayerRef} />{" "}
        {/* Hidden audio player controlled by the ref */}
        <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="p-2 hover:bg-white dark:bg-gray-800/50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>
              <h1 className="text-3xl font-bold text-emerald-950 dark:text-emerald-100">
                Create New Session
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Upload your presentation and configure your AI teaching assistant
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Basic Class Information */}
            <fieldset className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <legend className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 px-2">
                Basic Class Information
              </legend>

              {/* Course Selection - NEW */}
              <CourseSelector
                selectedCourseId={selectedCourseId}
                onCourseSelect={handleCourseSelect}
                required={true}
                disabled={isLoading}
              />

              <div>
                <label
                  htmlFor="className"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
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
                  placeholder="Introduction to AI - Lecture 1"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Name for this specific teaching session
                </p>
              </div>

              {/* Session Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Session Mode *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSessionMode('teaching')}
                    className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-colors ${
                      sessionMode === 'teaching'
                        ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:bg-gray-900'
                    }`}
                  >
                    <span className={`text-sm font-semibold ${sessionMode === 'teaching' ? 'text-emerald-800 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      📚 Teaching Mode
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      The AI guides and explains concepts. Loads the Teaching Prompt from the avatar template.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionMode('examination')}
                    className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-colors ${
                      sessionMode === 'examination'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:bg-gray-900'
                    }`}
                  >
                    <span className={`text-sm font-semibold ${sessionMode === 'examination' ? 'text-indigo-700' : 'text-gray-700 dark:text-gray-300'}`}>
                      📝 Examination Mode
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      The AI assesses and evaluates. Loads the Examination Prompt with strict assessment rules.
                    </span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  This determines which AI behaviour is used throughout the session and cannot be changed after creation.
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
                  <label htmlFor="avatar_select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Choose an avatar to apply its AI persona and enable role selection.
                  </p>
                </div>
              )}

              {/* Role selection — only shown when an avatar with roles is selected */}
              {availableRoles.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Student Role
                  </label>
                  <div className="space-y-2">
                    {availableRoles.map((role) => (
                      <label key={role.id} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${selectedRoleId === role.id ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                        <input
                          type="radio"
                          name="session_role"
                          value={role.id}
                          checked={selectedRoleId === role.id}
                          onChange={() => setSelectedRoleId(role.id)}
                          className="mt-0.5 accent-blue-600"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{role.name}</p>
                          {role.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{role.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    The AI will adapt its behaviour to the selected role.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Attach Materials from Course Materials (Optional)
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border p-2 rounded-lg bg-gray-50 dark:bg-gray-900">
                  {materials.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`material-${m.id}`}
                        checked={selectedMaterialIds.includes(m.id)}
                        onChange={(e) => handleMaterialSelection(m.id, e.target.checked)}
                      />
                      <label htmlFor={`material-${m.id}`} className="text-gray-700 dark:text-gray-300">
                        {m.title}
                      </label>
                    </div>
                  ))}
                  {materials.length === 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">No course materials available.</p>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Choose one or more existing course materials to include in this session.
                </p>
              </div>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="duration"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Duration (minutes)
                  </label>
                  <select
                    name="duration"
                    id="duration"
                    value={classDetails.duration}
                    onChange={handleInputChange}
                    className="w-full input-style"
                  >
                    {[30, 45, 60, 75, 90].map((d) => (
                      <option key={d} value={d}>
                        {d} minutes
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="sessionNumber"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Sequential session number
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Session Description (Optional)
                </label>
                <textarea
                  name="description"
                  id="description"
                  value={classDetails.description || ""}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full input-style"
                  placeholder="Brief overview of this session..."
                ></textarea>
              </div>
            </fieldset>
            {/* Section 2: Presentation File */}
            <fieldset className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <legend className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 px-2">
                Presentation File
              </legend>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver
                    ? "border-blue-400 bg-emerald-50 dark:bg-emerald-900/20"
                    : selectedFile
                    ? "border-green-400 bg-green-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.ppt,.pptx,.docx"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-700">
                      {selectedFile.name} ({selectedFile.size >= 1024 * 1024 ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : `${(selectedFile.size / 1024).toFixed(0)} KB`})
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Drag &amp; drop or click to browse (up to 30 MB)
                      </p>
                      <p className="text-xs text-gray-400">
                        Supported formats: PDF, PowerPoint (PPTX), Word (DOCX)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Solution file upload (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Professor Solution File{" "}
                  <span className="text-gray-400 font-normal">(optional — AI reference only, never shown to student)</span>
                </label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                    selectedSolutionFile
                      ? "border-purple-400 bg-purple-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  onClick={() => solutionFileInputRef.current?.click()}
                >
                  <input
                    ref={solutionFileInputRef}
                    type="file"
                    accept=".pdf,.ppt,.pptx,.docx"
                    onChange={handleSolutionFileInputChange}
                    className="hidden"
                  />
                  {selectedSolutionFile ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-purple-700">
                        {selectedSolutionFile.name} ({selectedSolutionFile.size >= 1024 * 1024 ? `${(selectedSolutionFile.size / 1024 / 1024).toFixed(1)} MB` : `${(selectedSolutionFile.size / 1024).toFixed(0)} KB`})
                      </p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedSolutionFile(null); }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Click to upload solution file (optional)</p>
                      <p className="text-xs text-gray-400">Supported: PDF, PPTX, DOCX</p>
                    </div>
                  )}
                </div>
              </div>

            </fieldset>

            {/* Section 3: Core AI Settings */}
            <fieldset className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <legend className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 px-2">
                Core AI Settings
              </legend>

              <div>
                <label
                  htmlFor="assistant_parameters.model"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  AI Model
                </label>
                <select
                  data-path="assistant_parameters.model"
                  id="assistant_parameters.model"
                  value={classDetails.assistant_parameters.model}
                  onChange={handleInputChange}
                  className="w-full input-style"
                >
                  <option value="gpt-4o-realtime-preview-2024-12-17">
                    GPT-4o Realtime (Recommended)
                  </option>
                  <option value="gpt-4o-mini-realtime-preview-2024-12-17">
                    GPT-4o Mini Realtime
                  </option>
                  <option value="gpt-realtime">GPT Realtime</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="assistant_parameters.voice"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Assistant Voice
                </label>
                <div className="flex items-center gap-2">
                  <select
                    data-path="assistant_parameters.voice"
                    id="assistant_parameters.voice"
                    value={classDetails.assistant_parameters.voice}
                    onChange={handleInputChange}
                    className="flex-grow input-style"
                  >
                    {["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"].map(
                      (v) => (
                        <option key={v} value={v}>
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </option>
                      )
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={() => playVoiceSample(classDetails.assistant_parameters.voice)}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500"
                    aria-label={`Preview voice ${classDetails.assistant_parameters.voice}`}
                  >
                    {currentlyPlayingVoice === classDetails.assistant_parameters.voice ? (
                      // Stop Icon (simple square)
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5 text-red-600"
                      >
                        <path d="M6 6h12v12H6z" />
                      </svg>
                    ) : (
                      // Play Icon (simple triangle)
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5 text-emerald-700 dark:text-emerald-400"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="assistant_parameters.temperature"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
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
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

            </fieldset>
            {/* Advanced Settings Sections */}
            {showSection && (
              <CollapsibleSection
                title="Advanced Tool Settings"
                isOpen={showAdvancedTools}
                onToggle={() => setShowAdvancedTools(!showAdvancedTools)}
              >
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="assistant_parameters.tool_choice"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Tool Choice
                    </label>
                    <select
                      data-path="assistant_parameters.tool_choice"
                      id="assistant_parameters.tool_choice"
                      value={classDetails.assistant_parameters.tool_choice}
                      onChange={handleInputChange}
                      className="w-full input-style"
                    >
                      <option value="auto">Auto</option>
                      <option value="none">None</option>
                      <option value="required">Required</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Controls if/how the model uses tools. Tools array itself is pre-configured.
                    </p>
                  </div>
                  {/* Add other model params like max_response_output_tokens, modalities if they need to be user-configurable */}
                </div>
              </CollapsibleSection>
            )}

            {showSection && (
              <CollapsibleSection
                title="Advanced Audio Settings"
                isOpen={showAdvancedAudio}
                onToggle={() => setShowAdvancedAudio(!showAdvancedAudio)}
              >
                <div className="space-y-6">
                  <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 border-b pb-1">Input Audio</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="assistant_parameters.input_audio_format"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Format
                      </label>
                      <select
                        data-path="assistant_parameters.input_audio_format"
                        id="assistant_parameters.input_audio_format"
                        value={classDetails.assistant_parameters.input_audio_format}
                        onChange={handleInputChange}
                        className="w-full input-style"
                      >
                        {["pcm16", "g711_ulaw", "g711_alaw"].map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="assistant_parameters.input_audio_noice_reduction.type"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Noise Reduction Type
                      </label>
                      <select
                        data-path="assistant_parameters.input_audio_noice_reduction.type"
                        id="assistant_parameters.input_audio_noice_reduction.type"
                        value={classDetails.assistant_parameters.input_audio_noice_reduction.type}
                        onChange={handleInputChange}
                        className="w-full input-style"
                      >
                        <option value="near_field">Near Field</option>
                        <option value="far_field">Far Field</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="assistant_parameters.input_audio_transcription.model"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Transcription Model
                      </label>
                      <select
                        data-path="assistant_parameters.input_audio_transcription.model"
                        id="assistant_parameters.input_audio_transcription.model"
                        value={classDetails.assistant_parameters.input_audio_transcription.model}
                        onChange={handleInputChange}
                        className="w-full input-style"
                      >
                        <option value="whisper-1">Whisper-1</option>
                        <option value="gpt-4o-transcribe">GPT-4o Transcribe</option>
                        <option value="gpt-4o-mini-transcribe">GPT-4o Mini Transcribe</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="assistant_parameters.input_audio_transcription.language"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Transcription Language
                      </label>
                      <input
                        type="text"
                        data-path="assistant_parameters.input_audio_transcription.language"
                        id="assistant_parameters.input_audio_transcription.language"
                        value={classDetails.assistant_parameters.input_audio_transcription.language}
                        onChange={handleInputChange}
                        className="w-full input-style"
                        placeholder="e.g., en, es, fr"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ISO 639-1 code (e.g., en for English).</p>
                    </div>
                  </div>

                  <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 border-b pb-1 mt-4">Output Audio</h4>
                  <div>
                    <label
                      htmlFor="assistant_parameters.output_audio_format"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Format
                    </label>
                    <select
                      data-path="assistant_parameters.output_audio_format"
                      id="assistant_parameters.output_audio_format"
                      value={classDetails.assistant_parameters.output_audio_format}
                      onChange={handleInputChange}
                      className="w-full input-style"
                    >
                      {["pcm16", "g711_ulaw", "g711_alaw"].map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {showSection && (
              <CollapsibleSection
                title="Advanced Turn Detection Settings"
                isOpen={showAdvancedTurnDetection}
                onToggle={() => setShowAdvancedTurnDetection(!showAdvancedTurnDetection)}
              >
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="turn_detection_type"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Turn Detection Type
                    </label>
                    <select
                      id="turn_detection_type"
                      value={classDetails.assistant_parameters.turn_detection?.type || "none"}
                      onChange={(e) => {
                        const type = e.target.value;
                        if (type === "none") {
                          setClassDetails((prev) => ({
                            ...prev,
                            assistant_parameters: {
                              ...prev.assistant_parameters,
                              turn_detection: null,
                            },
                          }));
                        } else {
                          setClassDetails((prev) => ({
                            ...prev,
                            assistant_parameters: {
                              ...prev.assistant_parameters,
                              turn_detection: {
                                ...defaultTurnDetectionParams,
                                type: type as "server_vad" | "semantic_vad",
                              },
                            },
                          }));
                        }
                      }}
                      className="w-full input-style"
                    >
                      <option value="none">None (Manual)</option>
                      <option value="server_vad">Server VAD</option>
                      <option value="semantic_vad">Semantic VAD</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Choose how the AI detects when users stop speaking
                    </p>
                  </div>

                  {classDetails.assistant_parameters.turn_detection?.type === "server_vad" && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor="assistant_parameters.turn_detection.threshold"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                          >
                            Threshold ({classDetails.assistant_parameters.turn_detection.threshold})
                          </label>
                          <input
                            type="range"
                            data-path="assistant_parameters.turn_detection.threshold"
                            id="assistant_parameters.turn_detection.threshold"
                            value={classDetails.assistant_parameters.turn_detection.threshold}
                            onChange={handleInputChange}
                            min="0.0"
                            max="1.0"
                            step="0.1"
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="assistant_parameters.turn_detection.silence_duration_ms"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                          >
                            Silence Duration (ms)
                          </label>
                          <input
                            type="number"
                            data-path="assistant_parameters.turn_detection.silence_duration_ms"
                            id="assistant_parameters.turn_detection.silence_duration_ms"
                            value={classDetails.assistant_parameters.turn_detection.silence_duration_ms}
                            onChange={handleInputChange}
                            className="w-full input-style"
                            placeholder="e.g., 1000"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="assistant_parameters.turn_detection.prefix_padding_ms"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Prefix Padding (ms)
                        </label>
                        <input
                          type="number"
                          data-path="assistant_parameters.turn_detection.prefix_padding_ms"
                          id="assistant_parameters.turn_detection.prefix_padding_ms"
                          value={classDetails.assistant_parameters.turn_detection.prefix_padding_ms}
                          onChange={handleInputChange}
                          className="w-full input-style"
                          placeholder="e.g., 300"
                        />
                      </div>
                    </>
                  )}

                  {classDetails.assistant_parameters.turn_detection?.type === "semantic_vad" && (
                    <div>
                      <label
                        htmlFor="assistant_parameters.turn_detection.eagerness"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Eagerness
                      </label>
                      <select
                        data-path="assistant_parameters.turn_detection.eagerness"
                        id="assistant_parameters.turn_detection.eagerness"
                        value={classDetails.assistant_parameters.turn_detection.eagerness}
                        onChange={handleInputChange}
                        className="w-full input-style"
                      >
                        <option value="low">Low</option>
                        <option value="auto">Auto</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  )}
                  {/* create_response and interrupt_response are now removed from UI */}
                </div>
              </CollapsibleSection>
            )}

            {/* Error Message and Submit Button */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 dark:bg-emerald-700 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
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
