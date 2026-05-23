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
    <div className="border border-gray-200 rounded-lg"> 
    <button 
      type="button" 
      onClick={onToggle} 
      className="w-full px-4 py-3 text-left flex justify-between items-center bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors" 
    > 
      <span className="font-medium text-gray-700">{title}</span> 
      <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}> 
      ▼ 
      </span> 
    </button> 
    {isOpen && ( 
      <div className="p-4 border-t border-gray-200"> 
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
      "You are a helpful assistant that can analyze the slide image and provide a detailed description of the content.",
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

  const [userInstructions, setUserInstructions] = useState("");
  // Function to get system instructions (same as in AISettings)
  const [coreInstructions, setCoreInstructions] = useState("");

  useEffect(() => {
    const fetchPrompt = async () => {
      const res = await fetch("/prompts/ai_prompt.txt");
      const res2 = await fetch("/prompts/core_prompt.txt");
      const editable_default = await res.text();
      const core_prompt = await res2.text();

      // setDefaultPrompt(editable_default);
      // Set default user instructions from the prompt file
      setUserInstructions(editable_default);
      setCoreInstructions(core_prompt);

      // Create structured instructions JSON
      const structuredInstructions = {
        version: "1.0",
        core: core_prompt,
        editable: editable_default,
        timestamp: new Date().toISOString(),
      };

      setClassDetails((prev) => ({
        ...prev,
        assistant_parameters: {
          ...prev.assistant_parameters,
          instructions: JSON.stringify(structuredInstructions),
        },
      }));
    };


    fetchPrompt();
  }, []);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setSelectedMaterialIds(prev => {
      let updated: string[];
      if (checked) {
        updated = [...prev, materialId];
      } else {
        updated = prev.filter(id => id !== materialId);
      }

      // Update userInstructions based on selected materials
      const selectedTitles = updated
        .map(id => materials.find(m => m.id === id)?.title)
        .filter(Boolean);

      let newInstructions = userInstructions;

      // Remove previous "This lecture should use..." lines
      newInstructions = newInstructions.replace(
        /This lecture should use the knowledge and align to the content of the following course material: .*/gi,
        ""
      ).trim();

      if (selectedTitles.length > 0) {
        newInstructions += `\n\nThis lecture should use the knowledge and align to the content of the following course material: ${selectedTitles.join(", ")}`;
      }

      setUserInstructions(newInstructions);

      return updated;
    });
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

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a PDF, PPT, or PPTX file");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      // 50MB limit
      setError("File size must be less than 50MB");
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
    if (!classDetails.visionInstructions.trim()) {
      setError("Vision instructions are required");
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
      // Create structured instructions JSON
      const structuredInstructions = {
        version: "1.0",
        core: coreInstructions,
        editable: userInstructions,
        timestamp: new Date().toISOString(),
      };

      // Transform classDetails to sessionDetails format for backend
      const sessionDetails = {
        courseId: selectedCourseId, // NEW: Use courseId instead of courseName/courseCode
        className: classDetails.className,
        description: classDetails.description || "",
        duration: classDetails.duration,
        visionInstructions: classDetails.visionInstructions,
        assistantParameters: {
          input_audio_format:
            classDetails.assistant_parameters.input_audio_format,
          input_audio_noise_reduction:
            classDetails.assistant_parameters.input_audio_noice_reduction,
          input_audio_transcription:
            classDetails.assistant_parameters.input_audio_transcription,
          instructions: JSON.stringify(structuredInstructions),
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
      };

      const formData = new FormData();
      formData.append("presentation", selectedFile!);
      formData.append("sessionDetails", JSON.stringify(sessionDetails));

      const response = await fetch(config.getApiUrl("/api/sessions/create"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error || result.message || "Failed to create session"
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <audio ref={audioPlayerRef} />{" "}
        {/* Hidden audio player controlled by the ref */}
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-gray-700" />
              </button>
              <h1 className="text-3xl font-bold text-blue-900">
                Create New Session
              </h1>
            </div>
            <p className="text-gray-600">
              Upload your presentation and configure your AI teaching assistant
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Basic Class Information */}
            <fieldset className="space-y-4 p-4 border border-gray-200 rounded-lg">
              <legend className="text-lg font-semibold text-blue-700 px-2">
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
                  className="block text-sm font-medium text-gray-700 mb-1"
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
                <p className="text-xs text-gray-500 mt-1">
                  Name for this specific teaching session
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attach Materials from Course Materials (Optional)
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border p-2 rounded-lg bg-gray-50">
                  {materials.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`material-${m.id}`}
                        checked={selectedMaterialIds.includes(m.id)}
                        onChange={(e) => handleMaterialSelection(m.id, e.target.checked)}
                      />
                      <label htmlFor={`material-${m.id}`} className="text-gray-700">
                        {m.title}
                      </label>
                    </div>
                  ))}
                  {materials.length === 0 && (
                    <p className="text-xs text-gray-500">No course materials available.</p>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Choose one or more existing course materials to include in this session.
                </p>
              </div>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="duration"
                    className="block text-sm font-medium text-gray-700 mb-1"
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
                    className="block text-sm font-medium text-gray-700 mb-1"
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
                  <p className="text-xs text-gray-500 mt-1">
                    Sequential session number
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
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
            <fieldset className="space-y-4 p-4 border border-gray-200 rounded-lg">
              <legend className="text-lg font-semibold text-blue-700 px-2">
                Presentation File
              </legend>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver
                    ? "border-blue-400 bg-blue-50"
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
                  accept=".pdf,.ppt,.pptx"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-700">
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
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
                    <p className="text-sm text-gray-600">
                      Drag & drop or click to browse (PDF up to 50MB)
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="visionInstructions"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Instruction to vision model
                </label>
                <textarea
                  name="visionInstructions"
                  id="visionInstructions"
                  value={classDetails.visionInstructions}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full input-style"
                  placeholder="You are a helpful assistant that can analyze the slide image and provide a detailed description of the content."
                ></textarea>
              </div>
            </fieldset>

            {/* Section 3: Core AI Settings */}
            <fieldset className="space-y-4 p-4 border border-gray-200 rounded-lg">
              <legend className="text-lg font-semibold text-blue-700 px-2">
                Core AI Settings
              </legend>

              <div>
                <label
                  htmlFor="assistant_parameters.model"
                  className="block text-sm font-medium text-gray-700 mb-1"
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
                  className="block text-sm font-medium text-gray-700 mb-1"
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
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-5 h-5 text-blue-600"
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
                  className="block text-sm font-medium text-gray-700 mb-1"
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

              {/* Custom Teaching Instructions */}
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="user_instructions"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Custom Teaching Instructions
                  </label>
                  <textarea
                    name="user_instructions"
                    id="user_instructions"
                    value={userInstructions}
                    onChange={(e) => setUserInstructions(e.target.value)}
                    rows={6}
                    className="w-full input-style"
                    placeholder="Add your custom teaching instructions here..."
                  ></textarea>
                  <p className="text-xs text-gray-500 mt-1">
                    Customize how the AI should behave during your specific teaching session.
                  </p>
                </div>

                {/* System Instructions (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ProfSidekick Core Instructions (System)
                  </label>
                  <textarea
                    value={coreInstructions}
                    readOnly
                    rows={8}
                    className="w-full input-style bg-gray-50 text-gray-600 cursor-not-allowed"
                  ></textarea>
                  <p className="text-xs text-gray-500 mt-1">
                    Core ProfSidekick functionality - these instructions cannot be modified.
                  </p>
                </div>
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
                      className="block text-sm font-medium text-gray-700 mb-1"
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
                    <p className="text-xs text-gray-500 mt-1">
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
                  <h4 className="text-md font-semibold text-gray-700 border-b pb-1">Input Audio</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="assistant_parameters.input_audio_format"
                        className="block text-sm font-medium text-gray-700 mb-1"
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
                        className="block text-sm font-medium text-gray-700 mb-1"
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
                        className="block text-sm font-medium text-gray-700 mb-1"
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
                        className="block text-sm font-medium text-gray-700 mb-1"
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
                      <p className="text-xs text-gray-500 mt-1">ISO 639-1 code (e.g., en for English).</p>
                    </div>
                  </div>

                  <h4 className="text-md font-semibold text-gray-700 border-b pb-1 mt-4">Output Audio</h4>
                  <div>
                    <label
                      htmlFor="assistant_parameters.output_audio_format"
                      className="block text-sm font-medium text-gray-700 mb-1"
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
                      className="block text-sm font-medium text-gray-700 mb-1"
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
                    <p className="text-xs text-gray-500 mt-1">
                      Choose how the AI detects when users stop speaking
                    </p>
                  </div>

                  {classDetails.assistant_parameters.turn_detection?.type === "server_vad" && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor="assistant_parameters.turn_detection.threshold"
                            className="block text-sm font-medium text-gray-700 mb-1"
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
                            className="block text-sm font-medium text-gray-700 mb-1"
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
                          className="block text-sm font-medium text-gray-700 mb-1"
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
                        className="block text-sm font-medium text-gray-700 mb-1"
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
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
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
