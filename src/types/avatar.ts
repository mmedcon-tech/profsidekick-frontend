// Avatar Platform — shared type definitions (mirrors backend schemas exactly)

// ── Template Version ─────────────────────────────────────────────

export interface AvatarTemplateVersionResponse {
  id: string;
  template_id: string;
  version_number: number;
  examination_prompt: string | null;
  teaching_prompt: string | null;
  document_analysis_prompt: string | null;
  status: 'draft' | 'published' | 'archived';
  change_notes: string | null;
  created_by: string;
  created_at: string;
  published_at: string | null;
  published_by: string | null;
}

export interface AvatarTemplateVersionCreate {
  examination_prompt?: string;
  teaching_prompt?: string;
  document_analysis_prompt?: string;
  change_notes?: string;
}

// ── Template Role ────────────────────────────────────────────────

export interface AvatarTemplateRoleResponse {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  prompt_context: string | null;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AvatarTemplateRoleCreate {
  name: string;
  description?: string;
  prompt_context?: string;
}

export interface AvatarTemplateRoleUpdate {
  name?: string;
  description?: string;
  prompt_context?: string;
  is_enabled?: boolean;
  sort_order?: number;
}

export interface RoleReorderRequest {
  role_ids: string[];
}

// ── Avatar Template ──────────────────────────────────────────────

export interface AvatarTemplateSummary {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
  published_state: 'unpublished' | 'draft' | 'published' | 'archived';
  avatar_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AvatarTemplateResponse extends AvatarTemplateSummary {
  created_by: string;
  current_version_id: string | null;
  current_version: AvatarTemplateVersionResponse | null;
  version_count: number;
  roles: AvatarTemplateRoleResponse[];
}

export interface AvatarTemplateDetailResponse extends AvatarTemplateResponse {
  versions: AvatarTemplateVersionResponse[];
}

export interface AvatarTemplateCreate {
  name: string;
  description?: string;
  category?: string;
}

export interface AvatarTemplateUpdate {
  name?: string;
  description?: string;
  category?: string;
  is_active?: boolean;
}

// ── Rubric ──────────────────────────────────────────────────────────

export interface RubricCreate {
  title: string;
  content: Record<string, unknown>;
}

export interface RubricResponse {
  id: string;
  avatar_configuration_id: string;
  title: string;
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Documents ───────────────────────────────────────────────────────

export interface KnowledgeDocumentResponse {
  id: string;
  avatar_configuration_id: string;
  title: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  content_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferenceSolutionResponse {
  id: string;
  avatar_configuration_id: string;
  title: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  content_text: string | null;
  created_at: string;
  updated_at: string;
}

// ── Configuration ────────────────────────────────────────────────────

export type TtsProvider = 'openai' | 'elevenlabs';

export interface AvatarConfigurationCreate {
  voice?: string;
  language?: string;
  difficulty_level?: string;
  additional_settings?: Record<string, unknown>;
  tts_provider?: TtsProvider;
}

export type AvatarConfigurationUpdate = AvatarConfigurationCreate;

export interface AvatarConfigurationResponse {
  id: string;
  avatar_id: string;
  voice: string | null;
  language: string | null;
  difficulty_level: string | null;
  additional_settings: Record<string, unknown> | null;
  tts_provider: TtsProvider | null;
  rubrics: RubricResponse[];
  knowledge_documents: KnowledgeDocumentResponse[];
  reference_solutions: ReferenceSolutionResponse[];
  created_at: string;
  updated_at: string;
}

// ── Voice Catalog ────────────────────────────────────────────────────

export interface VoiceCatalogEntry {
  id: string;
  name: string;
  dialects: string[];
}

export interface VoiceCatalogResponse {
  provider: TtsProvider;
  voices: VoiceCatalogEntry[];
  cost_per_1k_characters_usd: number;
}

// ── Avatar ───────────────────────────────────────────────────────────

// ── Teaching Preferences ────────────────────────────────────────

export type TeachingPace        = 'thorough' | 'balanced' | 'fast';
export type QuestioningStyle    = 'socratic'  | 'direct'   | 'guided';
export type FormalityLevel      = 'casual'    | 'balanced'  | 'formal';
export type DepthLevel          = 'surface'   | 'standard' | 'deep';
export type EncouragementLevel  = 'high'      | 'neutral'  | 'minimal';
export type LanguageLevel       = 'introductory' | 'intermediate' | 'advanced' | 'adaptive';

export interface TeachingPreferences {
  teaching_pace?:       TeachingPace;
  questioning_style?:   QuestioningStyle;
  formality_level?:     FormalityLevel;
  depth_level?:         DepthLevel;
  encouragement_level?: EncouragementLevel;
  language_level?:      LanguageLevel;
}

export interface PublisherAvatarProfile {
  id: string;
  publisher_avatar_id: string;
  teaching_pace:       string | null;
  questioning_style:   string | null;
  formality_level:     string | null;
  depth_level:         string | null;
  encouragement_level: string | null;
  language_level:      string | null;
  refined_prompt:      string | null;
  created_at: string;
  updated_at: string;
}

export interface AvatarCreate {
  template_id: string;
  name: string;
  description?: string;
  teaching_preferences?: TeachingPreferences;
}

export interface AvatarUpdate {
  name?: string;
  description?: string;
}

export interface AvatarSummary {
  id: string;
  template_id: string;
  publisher_id: string;
  name: string;
  description: string | null;
  is_published: boolean;
  template_image_url: string | null;
  template_name: string | null;
  profile: PublisherAvatarProfile | null;
  created_at: string;
  updated_at: string;
}

export interface AvatarResponse extends AvatarSummary {
  configuration: AvatarConfigurationResponse | null;
}

export type MarketplaceRenderType = 'static' | 'talkingheads' | 'heygen' | 'glb';

export interface AvatarPublicResponse {
  id: string;
  name: string;
  description: string | null;
  is_published: boolean;
  template_image_url: string | null;
  created_at: string;
  updated_at: string;
  tagline?: string | null;
  render_type?: MarketplaceRenderType;
  glb_library_id?: string | null;
  glb_preview_url?: string | null;
  is_enrolled?: boolean;
  rating?: number | null;
  course_count?: number | null;
  subscriber_count?: number | null;
  credits_per_session?: number | null;
  languages?: string[];
  voice_labels?: string[];
}

export interface AvatarListResponse {
  avatars: AvatarSummary[];
  total: number;
}

export interface AvatarPublicListResponse {
  avatars: AvatarPublicResponse[];
  total: number;
}

// ── Admin Dashboard ──────────────────────────────────────────────────

export interface TemplateDashboardStats {
  template_id: string;
  name: string;
  avatar_image_url: string | null;
  published_state: string;
  version_count: number;
  publisher_count: number;
  course_count: number;
  session_count: number;
  session_run_count: number;
}

export interface TemplatePublisherRow {
  publisher_id: string;
  username: string;
  email: string;
  avatar_id: string;
  avatar_name: string;
  is_published: boolean;
  created_at: string;
}

export interface TemplateCourseRow {
  course_id: string;
  name: string | null;
  code: string | null;
  publisher_username: string;
  session_count: number;
  is_active: boolean;
}

export interface TemplateSessionRunRow {
  run_id: string;
  session_id: string;
  session_name: string | null;
  publisher_username: string;
  status: string;
  start_time: string;
  end_time: string | null;
  role_at_start: string | null;
}

// ── User (admin list) ────────────────────────────────────────────────

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}
