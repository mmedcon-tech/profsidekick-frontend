/**
 * SAE API client.
 * All functions that require auth read the JWT from localStorage under "auth_token",
 * matching the convention used across the rest of the profsidekick frontend.
 */

import type {
  SAEBatchCreateResponse,
  SAEQuestionComment,
  SAERegenerateResponse,
  SAESetupResponse,
  SAEStudentDetail,
  SAEStudentMe,
  SAEStudentRow,
  SAESubmissionEditRequest,
  SAESubmissionResult,
  SAESubmissionResultPublisher,
  SAETokenValidationResponse,
  SAETranscribeResponse,
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

      if (Array.isArray(body.detail)) {
        detail = body.detail
          .map((item: { msg?: string }) => item.msg ?? "Validation error")
          .join("; ");
      } else if (typeof body.detail === "string") {
        detail = body.detail;
      } else if (typeof body.message === "string") {
        detail = body.message;
      }
    } catch {
      // Keep the HTTP status fallback.
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

export async function createStudentBatch(
  count: number,
  expiresDays?: number
): Promise<SAEBatchCreateResponse> {
  const res = await fetch(`${API}/api/sae/publisher/students/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ count, expires_days: expiresDays ?? null }),
  });
  return handleResponse<SAEBatchCreateResponse>(res);
}

export async function listStudents(
  search?: string
): Promise<SAEStudentRow[]> {
  const params = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await fetch(`${API}/api/sae/publisher/students${params}`, {
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

export async function getMyProfile(): Promise<SAEStudentMe> {
  const res = await fetch(`${API}/api/sae/student/me`, {
    headers: authHeaders(),
  });
  return handleResponse<SAEStudentMe>(res);
}

export async function getMySubmission(): Promise<SAESubmissionResult> {
  const res = await fetch(`${API}/api/sae/student/submission`, {
    headers: authHeaders(),
  });
  return handleResponse<SAESubmissionResult>(res);
}

export async function submitQuestionComment(
  questionId: string,
  comment: string
): Promise<SAEQuestionComment> {
  const res = await fetch(
    `${API}/api/sae/student/submission/comments/${encodeURIComponent(questionId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ comment }),
    }
  );

  return handleResponse<SAEQuestionComment>(res);
}

export async function transcribeExam(
  handwrittenFile: File,
  webassignFile: File
): Promise<SAETranscribeResponse> {
  const form = new FormData();
  form.append("student_answer", handwrittenFile);
  form.append("webassign_pdf", webassignFile);

  const res = await fetch(`${API}/api/sae/student/transcribe`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });

  return handleResponse<SAETranscribeResponse>(res);
}

export async function gradeDraftSubmission(): Promise<SAESubmissionResult> {
  const res = await fetch(`${API}/api/sae/student/grade-draft`, {
    method: "POST",
    headers: authHeaders(),
  });

  return handleResponse<SAESubmissionResult>(res);
}

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

export async function fetchPublisherStudentTranscript(
  studentId: string
): Promise<string> {
  const res = await fetch(
    `${API}/api/sae/publisher/students/${studentId}/files/transcript`,
    { headers: authHeaders() }
  );

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? body.message ?? detail;
    } catch {}
    throw new Error(detail);
  }

  return res.text();
}