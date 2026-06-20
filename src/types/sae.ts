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

export interface SAESubmissionResult {
  id: string;
  score: number | null;
  overall_confidence: string | null;
  review_required: boolean;
  result_json: Record<string, unknown> | null;
  submitted_by_publisher: boolean;
  created_at: string;
}

export interface SAEStudentDetail extends SAEStudentRow {
  submission: SAESubmissionResult | null;
}

export interface SAEStudentMe {
  id: string;
  student_number: number;
  student_code: string;
  display_name: string;
  is_activated: boolean;
  has_submitted: boolean;
}

// Grading question shape inside result_json
export interface SAEGradingQuestion {
  num: number;
  status: "correct" | "incorrect" | "partial" | string;
  feedback: string;
}
