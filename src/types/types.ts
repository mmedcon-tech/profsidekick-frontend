import { z } from "zod";

// Define the allowed moderation categories only once
export const MODERATION_CATEGORIES = [
  "OFFENSIVE",
  "OFF_BRAND",
  "VIOLENCE",
  "NONE",
] as const;

// Derive the union type for ModerationCategory from the array
export type ModerationCategory = (typeof MODERATION_CATEGORIES)[number];

// Create a Zod enum based on the same array
export const ModerationCategoryZod = z.enum([...MODERATION_CATEGORIES]);

export type SessionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";

// Updated for new backend structure
export interface SlideData {
  id: number;
  slideNumber: number;
  title: string;
  content: string;
  imagePath: string;
  thumbnailPath: string;
}

export interface PresentationData {
  filename: string;
  filePath: string;
  fileSize: number;
  fileType: string;
}

export interface AssistantParameters {
  input_audio_format: "pcm16" | "g711_ulaw" | "g711_alaw";
  input_audio_noise_reduction: {
    type: "near_field" | "far_field";
  };
  input_audio_transcription: {
    language: string;
    model: "gpt-4o-transcribe" | "gpt-4o-mini-transcribe" | "whisper-1";
  };
  instructions: string;
  model: "gpt-4o-realtime-preview-2024-12-17" | "gpt-4o-mini-realtime-preview-2024-12-17" | "gpt-realtime";
  output_audio_format: "pcm16" | "g711_ulaw" | "g711_alaw";
  temperature: number;
  tool_choice: "auto" | "none" | "required";
  tools: [];
  turn_detection: {
    type: null | "server_vad" | "semantic_vad";
    threshold: number;
    silence_duration_ms: number;
    prefix_padding_ms: number;
    suffix_padding_ms?: number;
    eagerness: "low" | "auto" | "high";
  } | null;
  voice: "alloy" | "ash" | "ballad" | "coral" | "echo" | "sage" | "shimmer" | "verse";
}

export interface SessionDetails {
  sessionId: string;
  userId: string;
  username: string;
  courseId: string;        // NEW: Course identifier
  courseName: string;      // Now from course table
  courseCode: string;      // Now from course table
  className: string;
  sessionNumber?: number;  // NEW: Optional session numbering
  sessionDate?: string;    // NEW: Optional session date
  description?: string;
  duration: number;
  presentationDetails: PresentationData;
  slidesDetails: SlideData[];
  assistantParameters: AssistantParameters;
}

export interface SessionRunDetails {
  sessionRunId: string;
  sessionId: string;
  userId: string;
  username: string;
  sessionRunMetadata?: any;
  assistantParameters: AssistantParameters;
  status: string;
  courseId: string;        // NEW: Course identifier
  courseName: string;      // Now from course table
  courseCode: string;      // Now from course table
  className: string;
  sessionNumber?: number;  // NEW: Optional session numbering
  sessionDate?: string;    // NEW: Optional session date
  description?: string;
  duration: number;
  presentationDetails: PresentationData;
  slidesDetails: SlideData[];
  startTime: string;
  endTime?: string;
}

// Legacy types for backward compatibility (will be removed)
export interface ClassDetails {
  className: string;
  courseName: string;
  courseCode: string;
  description?: string;
  duration: 30 | 45 | 60 | 75 | 90;
  visionInstructions: string;
  assistant_parameters: {
    input_audio_format: "pcm16" | "g711_ulaw" | "g711_alaw";
    input_audio_noice_reduction: {
      type: "near_field" | "far_field";
    };
    input_audio_transcription: {
      language: string;
      model: "gpt-4o-transcribe" | "gpt-4o-mini-transcribe" | "whisper-1";
    };
    instructions: string;
    model: "gpt-4o-realtime-preview-2024-12-17" | "gpt-4o-mini-realtime-preview-2024-12-17" | "gpt-realtime";
    output_audio_format: "pcm16" | "g711_ulaw" | "g711_alaw";
    temperature: number;
    tool_choice: "auto" | "none" | "required";
    tools: [];
    turn_detection: {
      type: null | "server_vad" | "semantic_vad";
      threshold: number;
      silence_duration_ms: number;
      prefix_padding_ms: number;
      eagerness: "low" | "auto" | "high";
    } | null;
    voice: "alloy" | "ash" | "ballad" | "coral" | "echo" | "sage" | "shimmer" | "verse";
  };
}

export interface ClassSession {
  sessionId: string;
  processedContent: string;
  slides: SlideData[];
  classDetails: ClassDetails;
  totalSlides: number;
  createdAt: string;
  status: "CREATED" | "RUNNING" | "COMPLETED" | "ARCHIVED";
}

// New type for session runs
export interface SessionRun {
  sessionRunId: string;
  sessionId: string;
  status: "ACTIVE" | "COMPLETED" | "FAILED";
  startedAt: string;
  endedAt?: string;
  classSession: ClassSession;
}

// Authentication
export interface AuthCredentials {
  username: string;
  password: string;
}

// Simplified for MVP
export interface TeachingState {
  currentSlide: number;
  isRecording: boolean;
  connectionStatus: SessionStatus;
  sessionId: string | null;
  slides: SlideData[];
  classDetails: ClassDetails | null;
}

export interface ToolParameterProperty {
  type: string;
  description?: string;
  enum?: string[];
  pattern?: string;
  properties?: Record<string, ToolParameterProperty>;
  required?: string[];
  additionalProperties?: boolean;
  items?: ToolParameterProperty;
}

export interface ToolParameters {
  type: string;
  properties: Record<string, ToolParameterProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface Tool {
  type: "function";
  name: string;
  description: string;
  parameters: ToolParameters;
}

export interface AgentConfig {
  name: string;
  publicDescription: string; // gives context to agent transfer tool
  instructions: string;
  tools: Tool[];
  toolLogic?: Record<
    string,
    (args: any, transcriptLogsFiltered: TranscriptItem[], addTranscriptBreadcrumb?: (title: string, data?: any) => void) => Promise<any> | any
  >;
  // addTranscriptBreadcrumb is a param in case we want to add additional breadcrumbs, e.g. for nested tool calls from a supervisor agent.
  downstreamAgents?:
    | AgentConfig[]
    | { name: string; publicDescription: string }[];
}

export type AllAgentConfigsType = Record<string, AgentConfig[]>;

export interface GuardrailResultType {
  status: "IN_PROGRESS" | "DONE";
  testText?: string; 
  category?: ModerationCategory;
  rationale?: string;
}

export interface TranscriptItem {
  itemId: string;
  type: "MESSAGE" | "BREADCRUMB";
  role?: "user" | "assistant";
  title?: string;
  data?: Record<string, any>;
  expanded: boolean;
  timestamp: string;
  createdAtMs: number;
  status: "IN_PROGRESS" | "DONE";
  isHidden: boolean;
  guardrailResult?: GuardrailResultType;
}

export interface Log {
  id: number;
  timestamp: string;
  direction: string;
  eventName: string;
  data: any;
  expanded: boolean;
  type: string;
}

export interface ServerEvent {
  type: string;
  event_id?: string;
  item_id?: string;
  transcript?: string;
  delta?: string;
  session?: {
    id?: string;
  };
  item?: {
    id?: string;
    object?: string;
    type?: string;
    status?: string;
    name?: string;
    arguments?: string;
    role?: "user" | "assistant";
    content?: {
      type?: string;
      transcript?: string | null;
      text?: string;
    }[];
  };
  response?: {
    output?: {
      id: string;
      type?: string;
      name?: string;
      arguments?: any;
      call_id?: string;
      role: string;
      content?: any;
    }[];
    metadata: Record<string, any>;
    status_details?: {
      error?: any;
    };
  };
}

export interface LoggedEvent {
  id: number;
  direction: "client" | "server";
  expanded: boolean;
  timestamp: string;
  eventName: string;
  eventData: Record<string, any>; // can have arbitrary objects logged
}

// Update the GuardrailOutputZod schema to use the shared ModerationCategoryZod
export const GuardrailOutputZod = z.object({
  moderationRationale: z.string(),
  moderationCategory: ModerationCategoryZod,
});

export type GuardrailOutput = z.infer<typeof GuardrailOutputZod>;

// API Response Types
export interface ApiErrorResponse {
  error: {
    code: "INVALID_FILE_FORMAT" | "SESSION_NOT_FOUND" | "PROCESSING_FAILED";
    message: string;
  };
  success: false;
}

export interface EphemeralTokenResponse {
  client_secret: {
    value: string;
    expires_at: string;
  };
}

/** A single text chunk returned by the RAG search-knowledge endpoint. */
export interface KnowledgeChunk {
  slide_number: number;
  chunk_index: number;
  content: string;
  score: number | null;
}

/** State set when the AI cites a specific slide as a source. */
export interface CitedSource {
  slideNumber: number;
  citedAt: number; // Date.now() timestamp — used to auto-clear after a delay
}
export interface Avatar {
  id: string;
  name: string;
  description: string;
  voice: string;
  imageUrl: string;
  accentColor: string;
}

export interface PersonaPreferenceSelections {
  teachingStyle: string;
  tone: string;
  pace: string;
  interactionLevel: string;
  subjectFocus: string;
}

export interface ProfessorPersona {
  id: string;
  userId: string;
  avatarId: string;
  avatar: Avatar;
  preferences: PersonaPreferenceSelections;
  refinedPrompt: string;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_PERSONA_PREFERENCES: PersonaPreferenceSelections = {
  teachingStyle: "collaborative",
  tone: "encouraging",
  pace: "moderate",
  interactionLevel: "high",
  subjectFocus: "conceptual understanding",
};
