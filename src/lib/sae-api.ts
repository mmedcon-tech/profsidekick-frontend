/**
 * SAE API client.
 * All functions that require auth read the JWT from localStorage under "auth_token",
 * matching the convention used across the rest of the profsidekick frontend.
 */

import type {
  SAEBatchCreateResponse,
  SAESetupResponse,
  SAEStudentDetail,
  SAEStudentMe,
  SAEStudentRow,
  SAESubmissionResult,
  SAETokenValidationResponse,
} from "@/types/sae";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function authHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
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
  password: string
): Promise<SAESetupResponse> {
  const res = await fetch(`${API}/api/sae/invite/${token}/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
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
): Promise<SAESubmissionResult> {
  const form = new FormData();
  form.append("student_answer", handwrittenFile);
  form.append("webassign_pdf", webassignFile);
  const res = await fetch(
    `${API}/api/sae/publisher/students/${studentId}/submit`,
    { method: "POST", headers: authHeaders(), body: form }
  );
  return handleResponse<SAESubmissionResult>(res);
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

export async function submitExam(
  handwrittenFile: File,
  webassignFile: File
): Promise<SAESubmissionResult> {
  const form = new FormData();
  form.append("student_answer", handwrittenFile);
  form.append("webassign_pdf", webassignFile);
  const res = await fetch(`${API}/api/sae/student/submit`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  return handleResponse<SAESubmissionResult>(res);
}
