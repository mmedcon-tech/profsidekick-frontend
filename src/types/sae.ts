// Self Assessment Exam (SAE) TypeScript types.
// Mirror the Pydantic schemas in profsidekick-api/app/schemas/sae.py.

export interface SAEStudentRow {
  id: string;
  student_number: number;
  student_code: string;
  display_name: string;
  invitation_url: string;
  invitation_token: string;
  is_activated: boolean;
  activated_at: string | null;
  has_submitted: boolean;
  submitted_at: string | null;
  country_of_origin: string | null;
  curriculum: string | null;
}

export interface SAEBatchCreateResponse {
  students: SAEStudentRow[];
  total_created: number;
}

export interface SAETokenValidationResponse {
  valid: boolean;
  student_code: string;
  display_name: string;
}

export interface SAESetupResponse {
  access_token: string;
  token_type: string;
  student_code: string;
  display_name: string;
}

/** Student-facing submission result. result_json is always the effective (possibly edited) grading. */
export interface SAESubmissionResult {
  id: string;
  score: number | null;
  overall_confidence: string | null;
  review_required: boolean;
  result_json: Record<string, unknown> | null;
  submitted_by_publisher: boolean;
  created_at: string;
  handwritten_filename: string | null;
  webassign_filename: string | null;
}

/** Publisher-facing submission result — includes edit metadata. */
export interface SAESubmissionResultPublisher extends SAESubmissionResult {
  is_edited: boolean;
  last_edited_at: string | null;
}

export interface SAEStudentDetail extends SAEStudentRow {
  submission: SAESubmissionResultPublisher | null;
}

export interface SAEStudentMe {
  id: string;
  student_number: number;
  student_code: string;
  display_name: string;
  is_activated: boolean;
  has_submitted: boolean;
  country_of_origin: string | null;
  curriculum: string | null;
}

export interface SAERegenerateResponse {
  invitation_url: string;
  invitation_token: string;
}

// ── Grading question shape inside result_json ─────────────────────────────────

export interface SAEGradingBasis {
  understanding_level: string;
  error_severity: string;
  work_completeness: string;
  recommended_credit_percent: number;
}

export interface SAEGradingQuestion {
  id: string;
  max_score: number;
  score: number | null;
  confidence: string;
  readability: string;
  grading_basis?: SAEGradingBasis;
  official_answer_summary: string;
  student_answer_summary: string;
  feedback: string;
  grey_areas: string[];
  human_review_required: boolean;
  human_review_reason: string | null;
}

// ── Instructor-edit request shapes ────────────────────────────────────────────

export interface SAEQuestionEdit {
  id: string;
  score?: number | null;
  feedback?: string;
}

export interface SAESubmissionEditRequest {
  overall_feedback?: string;
  questions?: SAEQuestionEdit[];
}
