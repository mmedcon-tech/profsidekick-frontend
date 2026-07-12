"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authHeaders,
  createAssessment,
  createStudentBatch,
  deleteStudent,
  getDefaultGradingPrompt,
  listAssessments,
  listStudents,
  regenerateStudentAccess,
  updateAssessmentPrompt,
} from "@/lib/sae-api";
import type { SAEAssessmentRow, SAEStudentRow } from "@/types/sae";
import { useGradingJobs } from "@/contexts/GradingJobsContext";
import ActiveGradingJobs from "@/components/sae/ActiveGradingJobs";
// SAE-only: avatar linking in assessments disabled — import kept for reference
// import { avatarApi, publisherPromptApi, type PromptTemplateResponse } from "@/lib/avatarApi";
// import type { AvatarSummary } from "@/types/avatar";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const SAE_ASSESSMENT_KEY = "sae_selected_assessment_id";

function readStoredAssessmentId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SAE_ASSESSMENT_KEY);
}

function writeStoredAssessmentId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) sessionStorage.setItem(SAE_ASSESSMENT_KEY, id);
  else sessionStorage.removeItem(SAE_ASSESSMENT_KEY);
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Toast = { id: number; text: string; kind: "success" | "error" };

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ on, labelOn, labelOff }: { on: boolean; labelOn: string; labelOff: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
      ${on ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}`}>
      {on ? labelOn : labelOff}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PublisherSAEPage() {
  const router = useRouter();
  const { trackJob } = useGradingJobs();

  const [students, setStudents] = useState<SAEStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);

  // Generate batch state
  const [showGenerate, setShowGenerate] = useState(false);
  const [genCount, setGenCount] = useState<number | "">("");
  const [genDays, setGenDays] = useState<number | "">("");
  const [generating, setGenerating] = useState(false);

  // New-batch result banner
  const [newBatch, setNewBatch] = useState<SAEStudentRow[] | null>(null);

  // Submit-on-behalf modal state (SSE progress now lives in ActiveGradingJobs)
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [soStudent, setSoStudent] = useState<SAEStudentRow | null>(null);
  const [hwFile, setHwFile] = useState<File | null>(null);
  const [waFile, setWaFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Regenerate-access modal
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenStudent, setRegenStudent] = useState<SAEStudentRow | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenUrl, setRegenUrl] = useState<string | null>(null);

  // Delete student modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SAEStudentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Assessment management
  const [assessments, setAssessments] = useState<SAEAssessmentRow[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(readStoredAssessmentId);
  const [showNewAssessment, setShowNewAssessment] = useState(false);
  const [newAssessmentName, setNewAssessmentName] = useState("");
  const [newAssessmentDesc, setNewAssessmentDesc] = useState("");
  // SAE-only: avatar linking disabled; state kept commented for reference
  // const [newAssessmentAvatarId, setNewAssessmentAvatarId] = useState<string>("");
  // SAE-only: avatar list disabled
  // const [avatarList, setAvatarList] = useState<AvatarSummary[]>([]);
  const [creatingAssessment, setCreatingAssessment] = useState(false);

  // Edit Prompt modal
  const [showEditPrompt, setShowEditPrompt] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptDirty, setPromptDirty] = useState(false);
  const [promptError, setPromptError] = useState("");
  const [loadingDefaultPrompt, setLoadingDefaultPrompt] = useState(false);

  function toast(text: string, kind: "success" | "error" = "success") {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, text, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  // ── Submit with fire-and-forget ───────────────────────────────────────────

  async function handleSubmitOnBehalf(e: React.FormEvent) {
    e.preventDefault();
    if (!soStudent || !hwFile || !waFile) return;

    setIsSubmitting(true);
    const requestId = crypto.randomUUID();

    // Open SSE channel BEFORE posting files so no events are missed.
    // This fetch is fast (~200ms) — just establishing the stream.
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      const sseResp = await fetch(
        `${API}/api/autograder/grade/events/${requestId}`,
        { headers: authHeaders() }
      );
      if (sseResp.ok && sseResp.body) {
        reader = sseResp.body.getReader();
      }
    } catch {
      // SSE unavailable — trackJob will still track via fetchPromise
    }

    const formData = new FormData();
    formData.append("student_answer", hwFile);
    formData.append("webassign_pdf", waFile);
    formData.append("request_id", requestId);

    const studentId = soStudent.id;
    const fetchPromise = fetch(
      `${API}/api/sae/publisher/students/${studentId}/submit`,
      { method: "POST", headers: authHeaders(), body: formData }
    );

    trackJob({
      requestId,
      studentId,
      studentName: soStudent.display_name,
      studentCode: soStudent.student_code,
      reader,
      fetchPromise,
    });

    // Close modal immediately — grading progress is now in the ActiveGradingJobs panel
    setShowSubmitModal(false);
    resetSubmitModal();
  }

  function resetSubmitModal() {
    setSoStudent(null);
    setHwFile(null);
    setWaFile(null);
    setIsSubmitting(false);
  }

  function openSubmitModal(student: SAEStudentRow) {
    resetSubmitModal();
    setSoStudent(student);
    setShowSubmitModal(true);
  }

  function closeSubmitModal() {
    setShowSubmitModal(false);
    resetSubmitModal();
  }

  // ── Assessments & student list ────────────────────────────────────────────

  useEffect(() => { loadAssessments(); loadStudents(); }, []);


  async function loadAssessments() {
    try {
      const data = await listAssessments();
      setAssessments(data);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to load assessments.", "error");
    }
  }

  async function loadStudents(q?: string) {
    setLoading(true);
    try {
      const data = await listStudents(q, selectedAssessmentId ?? undefined);
      setStudents(data);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to load students.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    writeStoredAssessmentId(selectedAssessmentId);
  }, [selectedAssessmentId]);

  useEffect(() => {
    const t = setTimeout(() => loadStudents(search || undefined), 350);
    return () => clearTimeout(t);
  }, [search, selectedAssessmentId]);

  // ── Generate batch ─────────────────────────────────────────────────────────

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAssessmentId || !genCount || Number(genCount) < 1) return;
    setGenerating(true);
    try {
      const res = await createStudentBatch(selectedAssessmentId, Number(genCount), genDays ? Number(genDays) : undefined);
      setNewBatch(res.students);
      loadStudents(search || undefined);
      setShowGenerate(false);
      setGenCount("");
      setGenDays("");
      toast(`${res.total_created} student(s) generated.`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Generation failed.", "error");
    } finally {
      setGenerating(false);
    }
  }

  function resetNewAssessmentModal() {
    setShowNewAssessment(false);
    setNewAssessmentName("");
    setNewAssessmentDesc("");
    // setNewAssessmentAvatarId(""); // SAE-only: avatar linking disabled
  }

  async function handleCreateAssessment(e: React.FormEvent) {
    e.preventDefault();
    if (!newAssessmentName.trim()) return;
    setCreatingAssessment(true);
    try {
      const a = await createAssessment(
        newAssessmentName.trim(),
        newAssessmentDesc.trim() || undefined,
        null,
        null, // SAE-only: avatar linking disabled; was: newAssessmentAvatarId || null
      );
      setAssessments((prev) => [a, ...prev]);
      setSelectedAssessmentId(a.id);
      resetNewAssessmentModal();
      toast(`Assessment "${a.name}" created.`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to create assessment.", "error");
    } finally {
      setCreatingAssessment(false);
    }
  }

  // ── Edit Prompt ────────────────────────────────────────────────────────────

  async function openEditPromptModal() {
    const assessment = assessments.find((a) => a.id === selectedAssessmentId);
    if (!assessment) return;
    setPromptError("");
    setPromptDirty(false);
    if (assessment.grading_prompt_snapshot) {
      setEditingPrompt(assessment.grading_prompt_snapshot);
      setShowEditPrompt(true);
    } else {
      // Legacy assessment created before snapshot-defaulting was deployed —
      // fetch the system default so the editor is never shown empty.
      setLoadingDefaultPrompt(true);
      try {
        const defaultBody = await getDefaultGradingPrompt();
        setEditingPrompt(defaultBody);
        setShowEditPrompt(true);
      } catch (err: unknown) {
        toast(err instanceof Error ? err.message : "Failed to load default prompt.", "error");
      } finally {
        setLoadingDefaultPrompt(false);
      }
    }
  }

  function closeEditPromptModal() {
    if (promptDirty && !window.confirm("You have unsaved changes. Close anyway?")) return;
    setShowEditPrompt(false);
    setEditingPrompt("");
    setPromptDirty(false);
    setPromptError("");
  }

  async function handleResetPromptToDefault() {
    setLoadingDefaultPrompt(true);
    try {
      const defaultBody = await getDefaultGradingPrompt();
      setEditingPrompt(defaultBody);
      setPromptDirty(true);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to load default prompt.", "error");
    } finally {
      setLoadingDefaultPrompt(false);
    }
  }

  async function handleSavePrompt() {
    if (!selectedAssessmentId) return;
    setSavingPrompt(true);
    setPromptError("");
    try {
      const updated = await updateAssessmentPrompt(selectedAssessmentId, editingPrompt);
      setAssessments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setPromptDirty(false);
      setShowEditPrompt(false);
      setEditingPrompt("");
      toast("Grading prompt saved.");
    } catch (err: unknown) {
      setPromptError(err instanceof Error ? err.message : "Failed to save prompt.");
    } finally {
      setSavingPrompt(false);
    }
  }

  // ── Regenerate access ──────────────────────────────────────────────────────

  function openRegenModal(student: SAEStudentRow) {
    setRegenStudent(student);
    setRegenUrl(null);
    setShowRegenModal(true);
  }

  async function handleRegenerate() {
    if (!regenStudent) return;
    setRegenerating(true);
    try {
      const res = await regenerateStudentAccess(regenStudent.id);
      setRegenUrl(res.invitation_url);
      loadStudents(search || undefined);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Regeneration failed.", "error");
      setShowRegenModal(false);
    } finally {
      setRegenerating(false);
    }
  }

  function openDeleteModal(student: SAEStudentRow) {
    setDeleteTarget(student);
    setShowDeleteModal(true);
  }

  async function handleDeleteStudent() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteStudent(deleteTarget.id);
      setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast(`${deleteTarget.display_name} removed.`);
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Delete failed.", "error");
    } finally {
      setDeleting(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => toast(`${label} copied.`));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Toast stack */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id}
            className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg
              ${t.kind === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
            {t.text}
          </div>
        ))}
      </div>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Assessments</h1>
          <p className="mt-1 text-sm text-slate-500">Manage pre-generated student slots and their submissions.</p>
        </div>
        <button
          onClick={() => setShowGenerate(true)}
          disabled={!selectedAssessmentId}
          title={!selectedAssessmentId ? "Select or create an assessment first" : undefined}
          className="shrink-0 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          + Generate Students
        </button>
      </div>

      {/* New batch banner */}
        {newBatch && newBatch.length > 0 && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-blue-900">
                {newBatch.length} new student(s) generated — copy their invitation links below
              </p>
              <button onClick={() => setNewBatch(null)} className="text-xs text-blue-600 hover:underline">Dismiss</button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {newBatch.map((s) => (
                <div key={s.id}
                  className="flex items-center justify-between rounded-lg bg-white border border-blue-100 px-3 py-2 gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-mono font-semibold text-slate-700">{s.student_code}</span>
                    <span className="ml-2 text-xs text-slate-500 truncate max-w-xs inline-block align-bottom">{s.invitation_url}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(s.invitation_url, s.student_code)}
                    className="shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-1 text-xs text-blue-800 hover:bg-blue-200 whitespace-nowrap"
                  >
                    Copy link
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assessment selector */}
        <div className="mb-4 flex items-center gap-3">
          <select
            value={selectedAssessmentId ?? ""}
            onChange={(e) => setSelectedAssessmentId(e.target.value || null)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white min-w-[220px]"
          >
            <option value="">All assessments ({assessments.length})</option>
            {assessments.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowNewAssessment(true)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 whitespace-nowrap transition-colors"
          >
            + New Assessment
          </button>
          <button
            onClick={openEditPromptModal}
            disabled={!selectedAssessmentId || loadingDefaultPrompt}
            title={!selectedAssessmentId ? "Select an assessment first" : "Edit the grading prompt for this assessment"}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingDefaultPrompt ? "Loading…" : "Edit Prompt for Grading"}
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student code or name…"
            className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-400">Loading…</div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <p className="text-sm">No students yet.</p>
              <button onClick={() => setShowGenerate(true)} className="mt-3 text-sm text-blue-600 hover:underline">
                Generate your first batch
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Invitation</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Submission</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{s.student_number}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{s.display_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.student_code}</td>
                    <td className="px-4 py-3">
                      <StatusBadge on={s.is_activated} labelOn="Activated" labelOff="Not activated" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge on={s.submission_count > 0} labelOn="Submitted" labelOff="Pending" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {!s.is_activated && s.invitation_url && (
                          <button onClick={() => copyToClipboard(s.invitation_url, s.student_code)}
                            className="rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100">
                            Copy link
                          </button>
                        )}
                        {s.is_activated && (
                          <button onClick={() => openRegenModal(s)}
                            className="rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-100">
                            Regenerate link
                          </button>
                        )}
                        {s.submission_count > 0 && (
                          <button onClick={() => router.push(`/publisher/sae/students/${s.id}`)}
                            className="rounded border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-100">
                            Review
                          </button>
                        )}
                        {s.submission_count < 5 && (
                          <button onClick={() => openSubmitModal(s)}
                            className="rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100">
                            Submit for
                          </button>
                        )}
                        <button
                          onClick={() => openDeleteModal(s)}
                          title="Delete student"
                          className="rounded border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-3 text-xs text-slate-400">
          {students.length} student{students.length !== 1 ? "s" : ""} shown
        </p>

      {/* ── Generate modal ─────────────────────────────────────────────────── */}
      {showGenerate && (
        <Modal title="Generate Student Slots" onClose={() => setShowGenerate(false)}>
          <form onSubmit={handleGenerate} className="space-y-4">
            {selectedAssessmentId && (
              <p className="text-sm text-slate-500">
                Adding to: <span className="font-medium text-slate-700">
                  {assessments.find((a) => a.id === selectedAssessmentId)?.name}
                </span>
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Number of students to generate</label>
              <input type="number" min={1} max={500} value={genCount}
                onChange={(e) => setGenCount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 20"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-slate-400">New slots are added to the existing pool — existing students are not affected.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Link expiry (days) — optional</label>
              <input type="number" min={1} max={365} value={genDays}
                onChange={(e) => setGenDays(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Leave blank for no expiry"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={generating || !genCount}
                className="flex-1 rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed">
                {generating ? "Generating…" : "Generate"}
              </button>
              <button type="button" onClick={() => setShowGenerate(false)}
                className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Regenerate access modal ───────────────────────────────────────── */}
      {showRegenModal && regenStudent && (
        <Modal title="Regenerate Access Link" onClose={() => { setShowRegenModal(false); setRegenUrl(null); }}>
          {regenUrl ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                A new link has been generated for <span className="font-semibold">{regenStudent.display_name}</span>.
                The student&apos;s previous login is now invalid.
              </p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 break-all text-xs font-mono text-slate-700">
                {regenUrl}
              </div>
              <button onClick={() => copyToClipboard(regenUrl, regenStudent.student_code)}
                className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                Copy link
              </button>
              <button onClick={() => { setShowRegenModal(false); setRegenUrl(null); }}
                className="w-full rounded-md border border-slate-300 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                This will reset <span className="font-semibold">{regenStudent.display_name}</span>&apos;s
                login credentials. They will not be able to sign in until they use the new link.
              </p>
              {regenStudent.submission_count > 0 && (
                <p className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  This student has {regenStudent.submission_count} submission{regenStudent.submission_count !== 1 ? "s" : ""}.
                  Their submissions and grades will be fully preserved.
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={handleRegenerate} disabled={regenerating}
                  className="flex-1 rounded-md bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed">
                  {regenerating ? "Regenerating…" : "Confirm & regenerate"}
                </button>
                <button type="button" onClick={() => setShowRegenModal(false)}
                  className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ── Submit-on-behalf modal ────────────────────────────────────────── */}
      {showSubmitModal && soStudent && (
        <Modal
          title={`Submit for ${soStudent.display_name}`}
          onClose={closeSubmitModal}
          wide
        >
          <form onSubmit={handleSubmitOnBehalf} className="space-y-4">
            <p className="text-sm text-slate-600">
              You are submitting on behalf of{" "}
              <span className="font-semibold">{soStudent.display_name}</span>{" "}
              ({soStudent.student_code}). Grading progress will appear in the panel at the
              bottom-right of the screen — you can submit more students while this is grading.
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Student Answer PDF</label>
              <input type="file" accept=".pdf" onChange={(e) => setHwFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Questions PDF</label>
              <input type="file" accept=".pdf" onChange={(e) => setWaFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={!hwFile || !waFile || isSubmitting}
                className="flex-1 rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Starting…" : "Submit & Grade"}
              </button>
              <button type="button" onClick={closeSubmitModal}
                className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── New Assessment modal ─────────────────────────────────────────── */}
      {showNewAssessment && (
        <Modal
          title="New Assessment"
          onClose={resetNewAssessmentModal}
        >
          <form onSubmit={handleCreateAssessment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assessment name</label>
              <input
                type="text"
                value={newAssessmentName}
                onChange={(e) => setNewAssessmentName(e.target.value)}
                placeholder="e.g. Fall 2025 Placement Test"
                autoFocus
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
              <textarea
                value={newAssessmentDesc}
                onChange={(e) => setNewAssessmentDesc(e.target.value)}
                placeholder="Optional notes about this assessment…"
                rows={2}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>
            {/* SAE-only: avatar linking in assessment creation disabled.
            Restore by un-commenting this block and the avatarList/newAssessmentAvatarId state above.
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Linked avatar (optional)</label>
              <select
                value={newAssessmentAvatarId}
                onChange={(e) => setNewAssessmentAvatarId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">No avatar</option>
                {avatarList.map((av) => (
                  <option key={av.id} value={av.id}>{av.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                Linking an avatar snapshots its grading prompt at creation. You can change this later from the avatar&apos;s page.
              </p>
            </div>
            */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={creatingAssessment || !newAssessmentName.trim()}
                className="flex-1 rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creatingAssessment ? "Creating…" : "Create Assessment"}
              </button>
              <button
                type="button"
                onClick={resetNewAssessmentModal}
                className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Grading Prompt modal ─────────────────────────────────────── */}
      {showEditPrompt && selectedAssessmentId && (
        <Modal
          title={`Grading Prompt — ${assessments.find((a) => a.id === selectedAssessmentId)?.name ?? ""}`}
          onClose={closeEditPromptModal}
          wide
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              This prompt is sent to the AI for every submission graded under this assessment.
              Edits take effect on the next submission — past grades are not changed.
            </p>

            <textarea
              value={editingPrompt}
              onChange={(e) => {
                setEditingPrompt(e.target.value);
                setPromptDirty(true);
              }}
              rows={20}
              spellCheck={false}
              className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
            />

            <p className="text-right text-xs text-slate-400">
              {editingPrompt.length.toLocaleString()} characters
            </p>

            {promptError && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {promptError}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleResetPromptToDefault}
                disabled={loadingDefaultPrompt || savingPrompt}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
              >
                {loadingDefaultPrompt ? "Loading…" : "Reset to default"}
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeEditPromptModal}
                  disabled={savingPrompt}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePrompt}
                  disabled={savingPrompt || !promptDirty || editingPrompt.trim().length < 50}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {savingPrompt ? "Saving…" : "Save Prompt"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete student modal ─────────────────────────────────────────── */}
      {showDeleteModal && deleteTarget && (
        <Modal title="Delete Student Slot" onClose={() => { setShowDeleteModal(false); setDeleteTarget(null); }}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Permanently delete <span className="font-semibold">{deleteTarget.display_name}</span>{" "}
              (<span className="font-mono text-xs">{deleteTarget.student_code}</span>)?
              Their invitation link will become invalid and this cannot be undone.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleDeleteStudent}
                disabled={deleting}
                className="flex-1 rounded-md bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
                className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Floating active-grading panel — renders itself only when there are jobs */}
      <ActiveGradingJobs />
    </div>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`relative rounded-xl bg-white shadow-xl w-full ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
