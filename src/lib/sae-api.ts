/**
 * SAE API client.
 * All functions that require auth read the JWT from localStorage under "auth_token",
 * matching the convention used across the rest of the profsidekick frontend.
 */

import type {
  SAEAdminAssessmentRow,
  SAEAdminStudentRow,
  SAEAssessmentRow,
  SAEBatchCreateResponse,
  SAERegenerateResponse,
  SAESetupResponse,
  SAEStudentDetail,
  SAEStudentEnrollment,
  SAEStudentMe,
  SAEStudentRow,
  SAESubmissionEditRequest,
  SAESubmissionResult,
  SAESubmissionResultPublisher,
  SAETokenValidationResponse,
} from "@/types/sae";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

function authHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  return {
    // Tells nginx which backend to route this request to
    "X-Frontend-Instance": process.env.NEXT_PUBLIC_FRONTEND_INSTANCE ?? "main",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? body.message ?? detail;
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

// ── Public (no auth) ──────────────────────────────────────────────────────────

export async function validateInviteToken(
  token: string
): Promise<SAETokenValidationResponse> {
  const res = await fetch(`${API}/api/sae/invite/${token}`);
  return handleResponse<SAETokenValidationResponse>(res);
}

export async function setupAccount(
  token: string,
  username: string,
  password: string,
  country_of_origin: string,
  curriculum: string
): Promise<SAESetupResponse> {
  const res = await fetch(`${API}/api/sae/invite/${token}/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, country_of_origin, curriculum }),
  });
  return handleResponse<SAESetupResponse>(res);
}

// ── Publisher ─────────────────────────────────────────────────────────────────

export async function listAssessments(): Promise<SAEAssessmentRow[]> {
  const res = await fetch(`${API}/api/sae/publisher/assessments`, {
    headers: authHeaders(),
  });
  return handleResponse<SAEAssessmentRow[]>(res);
}

export async function createAssessment(
  name: string,
  description?: string,
  grading_prompt_template_id?: string | null,
  avatar_id?: string | null,
): Promise<SAEAssessmentRow> {
  const res = await fetch(`${API}/api/sae/publisher/assessments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      name,
      description: description ?? null,
      course_id: null,
      grading_prompt_template_id: grading_prompt_template_id ?? null,
      avatar_id: avatar_id ?? null,
    }),
  });
  return handleResponse<SAEAssessmentRow>(res);
}

export async function linkAvatarToAssessment(
  assessmentId: string,
  avatarId: string | null,
): Promise<SAEAssessmentRow> {
  const res = await fetch(
    `${API}/api/sae/publisher/assessments/${assessmentId}/avatar`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ avatar_id: avatarId }),
    }
  );
  return handleResponse<SAEAssessmentRow>(res);
}

export async function createStudentBatch(
  assessmentId: string,
  count: number,
  expiresDays?: number
): Promise<SAEBatchCreateResponse> {
  const res = await fetch(`${API}/api/sae/publisher/students/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ assessment_id: assessmentId, count, expires_days: expiresDays ?? null }),
  });
  return handleResponse<SAEBatchCreateResponse>(res);
}

export async function listStudents(
  search?: string,
  assessmentId?: string
): Promise<SAEStudentRow[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (assessmentId) params.set("assessment_id", assessmentId);
  const qs = params.toString() ? `?${params}` : "";
  const res = await fetch(`${API}/api/sae/publisher/students${qs}`, {
    headers: authHeaders(),
  });
  return handleResponse<SAEStudentRow[]>(res);
}

export async function getStudentDetail(
  studentId: string
): Promise<SAEStudentDetail> {
  const res = await fetch(`${API}/api/sae/publisher/students/${studentId}`, {
    headers: authHeaders(),
  });
  return handleResponse<SAEStudentDetail>(res);
}

export async function submitOnBehalf(
  studentId: string,
  handwrittenFile: File,
  webassignFile: File
): Promise<SAESubmissionResultPublisher> {
  const form = new FormData();
  form.append("student_answer", handwrittenFile);
  form.append("webassign_pdf", webassignFile);
  const res = await fetch(
    `${API}/api/sae/publisher/students/${studentId}/submit`,
    { method: "POST", headers: authHeaders(), body: form }
  );
  return handleResponse<SAESubmissionResultPublisher>(res);
}

export async function regenerateStudentAccess(
  studentId: string
): Promise<SAERegenerateResponse> {
  const res = await fetch(
    `${API}/api/sae/publisher/students/${studentId}/regenerate`,
    { method: "POST", headers: authHeaders() }
  );
  return handleResponse<SAERegenerateResponse>(res);
}

/** Edit the active submission for a student. */
export async function updateSubmission(
  studentId: string,
  edits: SAESubmissionEditRequest
): Promise<SAESubmissionResultPublisher> {
  const res = await fetch(
    `${API}/api/sae/publisher/students/${studentId}/submission`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(edits),
    }
  );
  return handleResponse<SAESubmissionResultPublisher>(res);
}

/** Download the active submission's PDF for a student (publisher view). */
export async function fetchPublisherStudentFile(
  studentId: string,
  fileType: "handwritten" | "webassign"
): Promise<ArrayBuffer> {
  const res = await fetch(
    `${API}/api/sae/publisher/students/${studentId}/files/${fileType}`,
    { headers: authHeaders() }
  );
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? body.message ?? detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.arrayBuffer();
}

// ── Student ───────────────────────────────────────────────────────────────────

/** Returns is_enrolled=false for regular subscribers not in the SAE system. */
export async function getMyProfile(): Promise<SAEStudentMe> {
  const res = await fetch(`${API}/api/sae/student/me`, {
    headers: authHeaders(),
  });
  return handleResponse<SAEStudentMe>(res);
}

/**
 * Returns all active SAE enrolments for the authenticated student.
 * Triggers a server-side sync so new active assessments auto-appear.
 * Returns an empty array for subscribers not enrolled in any assessment.
 */
export async function getMyEnrollments(): Promise<SAEStudentEnrollment[]> {
  const res = await fetch(`${API}/api/sae/student/enrollments`, {
    headers: authHeaders(),
  });
  return handleResponse<SAEStudentEnrollment[]>(res);
}

/** Legacy: returns the active submission only. Prefer getMySubmissions(). */
export async function getMySubmission(): Promise<SAESubmissionResult> {
  const res = await fetch(`${API}/api/sae/student/submission`, {
    headers: authHeaders(),
  });
  return handleResponse<SAESubmissionResult>(res);
}

/**
 * Returns all submissions for the authenticated student, oldest first.
 * Pass assessmentId to scope to a specific assessment; omit to use the first enrolment.
 */
export async function getMySubmissions(assessmentId?: string): Promise<SAESubmissionResult[]> {
  const qs = assessmentId ? `?assessment_id=${encodeURIComponent(assessmentId)}` : "";
  const res = await fetch(`${API}/api/sae/student/submissions${qs}`, {
    headers: authHeaders(),
  });
  return handleResponse<SAESubmissionResult[]>(res);
}

/** Returns a single historical submission by ID. */
export async function getMySubmissionById(
  submissionId: string
): Promise<SAESubmissionResult> {
  const res = await fetch(`${API}/api/sae/student/submissions/${submissionId}`, {
    headers: authHeaders(),
  });
  return handleResponse<SAESubmissionResult>(res);
}

export async function submitExam(
  handwrittenFile: File,
  webassignFile: File,
  assessmentId?: string,
): Promise<SAESubmissionResult> {
  const form = new FormData();
  form.append("student_answer", handwrittenFile);
  form.append("webassign_pdf", webassignFile);
  if (assessmentId) form.append("assessment_id", assessmentId);
  const res = await fetch(`${API}/api/sae/student/submit`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  return handleResponse<SAESubmissionResult>(res);
}

/** Download a PDF from a specific historical submission. */
export async function fetchMySubmissionFile(
  submissionId: string,
  fileType: "handwritten" | "webassign"
): Promise<ArrayBuffer> {
  const res = await fetch(
    `${API}/api/sae/student/submissions/${submissionId}/files/${fileType}`,
    { headers: authHeaders() }
  );
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? body.message ?? detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.arrayBuffer();
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function adminListSAEAssessments(): Promise<SAEAdminAssessmentRow[]> {
  const res = await fetch(`${API}/api/admin/sae/assessments`, {
    headers: authHeaders(),
  });
  return handleResponse<SAEAdminAssessmentRow[]>(res);
}

export async function adminListSAEStudents(
  assessmentId?: string
): Promise<SAEAdminStudentRow[]> {
  const qs = assessmentId ? `?assessment_id=${assessmentId}` : "";
  const res = await fetch(`${API}/api/admin/sae/students${qs}`, {
    headers: authHeaders(),
  });
  return handleResponse<SAEAdminStudentRow[]>(res);
}

/** Legacy: download the active submission's PDF. Prefer fetchMySubmissionFile(). */
export async function fetchMyFile(
  fileType: "handwritten" | "webassign"
): Promise<ArrayBuffer> {
  const res = await fetch(`${API}/api/sae/student/files/${fileType}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? body.message ?? detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.arrayBuffer();
}
