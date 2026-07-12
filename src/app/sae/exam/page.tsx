"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchMySubmissionFile,
  getMyEnrollments,
  getMySubmissions,
  submitExam,
} from "@/lib/sae-api";
import SAEPdfViewer from "@/components/sae/SAEPdfViewer";
import type {
  SAEGradingBasis,
  SAEGradingQuestion,
  SAEStudentEnrollment,
  SAESubmissionResult,
} from "@/types/sae";

// ── Page state ─────────────────────────────────────────────────────────────────

type PageState =
  | { kind: "loading" }
  | { kind: "not_enrolled" }
  | { kind: "main"; enrollments: SAEStudentEnrollment[]; selected: SAEStudentEnrollment; submissions: SAESubmissionResult[] }
  | { kind: "viewing"; enrollments: SAEStudentEnrollment[]; selected: SAEStudentEnrollment; submissions: SAESubmissionResult[]; viewedSub: SAESubmissionResult };

// ── Divider helpers ────────────────────────────────────────────────────────────

const STUDENT_DIVIDER_KEY = "sae_student_divider_pct";
const DEFAULT_DIVIDER_PCT = 50;
const MIN_PANEL_PCT = 20;
const MAX_PANEL_PCT = 80;

function loadStudentDividerPct(): number {
  if (typeof window === "undefined") return DEFAULT_DIVIDER_PCT;
  const stored = localStorage.getItem(STUDENT_DIVIDER_KEY);
  const parsed = stored ? parseFloat(stored) : NaN;
  return isNaN(parsed)
    ? DEFAULT_DIVIDER_PCT
    : Math.min(MAX_PANEL_PCT, Math.max(MIN_PANEL_PCT, parsed));
}

// ── Shared components ──────────────────────────────────────────────────────────

function StatusBadge({ on, labelOn, labelOff }: { on: boolean; labelOn: string; labelOff: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
      ${on ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}`}>
      {on ? labelOn : labelOff}
    </span>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative rounded-xl bg-white shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Root page component ────────────────────────────────────────────────────────

export default function SAEExamPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>({ kind: "loading" });
  const [submitError, setSubmitError] = useState("");
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/login?next=/sae/exam");
      return;
    }

    getMyEnrollments()
      .then((enrollments) => {
        if (enrollments.length === 0) {
          setPageState({ kind: "not_enrolled" });
          return;
        }
        const selected = enrollments[0];
        return getMySubmissions(selected.assessment_id).then((submissions) => {
          setPageState({ kind: "main", enrollments, selected, submissions });
        });
      })
      .catch((err: Error) => {
        if (err.message.includes("401")) {
          router.replace("/login?next=/sae/exam");
        } else {
          setPageState({ kind: "not_enrolled" });
        }
      });
  }, [router]);

  async function handleSelectEnrollment(assessmentId: string) {
    const base = pageState as { enrollments: SAEStudentEnrollment[]; selected: SAEStudentEnrollment };
    const next = base.enrollments.find((e) => e.assessment_id === assessmentId);
    if (!next) return;
    const submissions = await getMySubmissions(next.assessment_id);
    setPageState({ kind: "main", enrollments: base.enrollments, selected: next, submissions });
  }

  async function handleSubmit(handwrittenFile: File, webassignFile: File) {
    const { enrollments, selected, submissions } = pageState as {
      enrollments: SAEStudentEnrollment[];
      selected: SAEStudentEnrollment;
      submissions: SAESubmissionResult[];
    };
    setSubmitError("");
    try {
      const newSub = await submitExam(handwrittenFile, webassignFile, selected.assessment_id);
      const updated = [...submissions, newSub];
      // Refresh the selected enrollment to update submission_count
      const freshEnrollments = await getMyEnrollments();
      const freshSelected = freshEnrollments.find((e) => e.assessment_id === selected.assessment_id) ?? selected;
      setShowSubmitModal(false);
      setPageState({ kind: "viewing", enrollments: freshEnrollments, selected: freshSelected, submissions: updated, viewedSub: newSub });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed.";
      setSubmitError(msg);
    }
  }

  function handleViewSubmission(viewedSub: SAESubmissionResult) {
    const base = pageState as {
      enrollments: SAEStudentEnrollment[];
      selected: SAEStudentEnrollment;
      submissions: SAESubmissionResult[];
    };
    setPageState({ kind: "viewing", enrollments: base.enrollments, selected: base.selected, submissions: base.submissions, viewedSub });
  }

  function handleBackFromViewing() {
    const { enrollments, selected, submissions } = pageState as {
      enrollments: SAEStudentEnrollment[];
      selected: SAEStudentEnrollment;
      submissions: SAESubmissionResult[];
      viewedSub: SAESubmissionResult;
    };
    setPageState({ kind: "main", enrollments, selected, submissions });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (pageState.kind === "loading") {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Loading…</p>
      </div>
    );
  }

  if (pageState.kind === "not_enrolled") {
    return <NotEnrolledView />;
  }

  if (pageState.kind === "viewing") {
    const { selected, viewedSub } = pageState;
    const fetchFile = (fileType: "handwritten" | "webassign") =>
      fetchMySubmissionFile(viewedSub.id, fileType);
    return (
      <ResultView
        enrollment={selected}
        submission={viewedSub}
        fetchFile={fetchFile}
        onBack={handleBackFromViewing}
      />
    );
  }

  // kind === "main"
  const { enrollments, selected, submissions } = pageState;
  const atLimit = selected.submission_count >= 5;
  const sortedSubmissions = [...submissions].sort(
    (a, b) => (b.submission_number ?? 0) - (a.submission_number ?? 0)
  );

  return (
    <div className="p-4 sm:p-6">
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Assessments</h1>
          <p className="mt-1 text-sm text-slate-500">View and submit your exam results.</p>
        </div>
        <button
          onClick={() => { setSubmitError(""); setShowSubmitModal(true); }}
          disabled={atLimit}
          title={atLimit ? "Maximum submissions reached" : undefined}
          className="shrink-0 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          + Submit Exam
        </button>
      </div>

      {/* Assessment selector */}
      <div className="flex items-center gap-3">
        <select
          value={selected.assessment_id}
          onChange={(e) => handleSelectEnrollment(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white min-w-[220px] text-slate-700"
        >
          {enrollments.map((e) => (
            <option key={e.assessment_id} value={e.assessment_id}>
              {e.assessment_name ?? e.assessment_id}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">
          {selected.submission_count} of 5 submissions used
        </span>
      </div>

      {/* Submissions table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {sortedSubmissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <p className="text-sm">No submissions yet.</p>
            {!atLimit && (
              <button
                onClick={() => { setSubmitError(""); setShowSubmitModal(true); }}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Submit your first exam
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Submitted by</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Human Review</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedSubmissions.map((sub) => {
                const rj = sub.result_json as Record<string, unknown> | null;
                const rawScore = rj?.raw_score as number | undefined;
                const rawMax = rj?.raw_max_score as number | undefined;
                const scoreDisplay =
                  rawScore !== undefined && rawMax !== undefined
                    ? `${rawScore} / ${rawMax}`
                    : sub.score !== null
                    ? `${sub.score}%`
                    : "—";

                return (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{sub.submission_number ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {new Date(sub.created_at).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        on={sub.submitted_by_publisher}
                        labelOn="Instructor"
                        labelOff="You"
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{scoreDisplay}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        on={sub.review_required}
                        labelOn="Required"
                        labelOff="Not required"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleViewSubmission(sub)}
                        className="rounded border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-100"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {sortedSubmissions.length} submission{sortedSubmissions.length !== 1 ? "s" : ""} shown
      </p>

      {/* Submit modal */}
      {showSubmitModal && (
        <Modal title="Submit Exam" onClose={() => setShowSubmitModal(false)}>
          <SubmitForm
            enrollment={selected}
            submissionCount={submissions.length}
            submitError={submitError}
            onSubmit={handleSubmit}
            onCancel={() => setShowSubmitModal(false)}
          />
        </Modal>
      )}
    </div>
    </div>
  );
}

// ── Submit form (inside modal) ────────────────────────────────────────────────

function SubmitForm({
  enrollment,
  submissionCount,
  submitError,
  onSubmit,
  onCancel,
}: {
  enrollment: SAEStudentEnrollment;
  submissionCount: number;
  submitError: string;
  onSubmit: (handwritten: File, webassign: File) => Promise<void>;
  onCancel: () => void;
}) {
  const [handwrittenFile, setHandwrittenFile] = useState<File | null>(null);
  const [webassignFile, setWebassignFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!handwrittenFile || !webassignFile || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(handwrittenFile, webassignFile);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <p className="text-sm text-slate-600">
        Submitting as{" "}
        <span className="font-semibold">{enrollment.display_name}</span>{" "}
        <span className="text-slate-400">({enrollment.student_code})</span>
        {" "}· Submission {submissionCount + 1} of 5
      </p>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Student Answer PDF</label>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setHandwrittenFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium"
        />
        {handwrittenFile && (
          <p className="mt-1 text-xs text-green-700">Selected: {handwrittenFile.name}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Questions PDF</label>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setWebassignFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium"
        />
        {webassignFile && (
          <p className="mt-1 text-xs text-green-700">Selected: {webassignFile.name}</p>
        )}
      </div>

      {submitError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={!handwrittenFile || !webassignFile || submitting}
          className="flex-1 rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Grading…" : "Submit & Grade"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Not enrolled view ─────────────────────────────────────────────────────────

function NotEnrolledView() {
  return (
    <div className="p-4 sm:p-6">
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Assessments</h1>
        <p className="mt-1 text-sm text-slate-500">View and submit your exam results.</p>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <p className="text-sm font-medium text-slate-600">
            You don&apos;t have credits or access to make a submission.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Contact your instructor if you believe this is an error.
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}

// ── Result view (full-screen) ─────────────────────────────────────────────────

function ResultView({
  enrollment,
  submission,
  fetchFile,
  onBack,
}: {
  enrollment: SAEStudentEnrollment;
  submission: SAESubmissionResult;
  fetchFile: (fileType: "handwritten" | "webassign") => Promise<ArrayBuffer>;
  onBack: () => void;
}) {
  const rj = submission.result_json as Record<string, unknown> | null;
  const questions = (rj?.questions ?? []) as SAEGradingQuestion[];
  const rawScore = rj?.raw_score as number | undefined;
  const rawMax = rj?.raw_max_score as number | undefined;
  const overallFeedback = rj?.overall_feedback as string | undefined;
  const reviewReasons = (rj?.submission_review_reasons ?? []) as string[];

  // ── PDF toggle ────────────────────────────────────────────────────────────
  const [pdfVisible, setPdfVisible] = useState(false);
  const [activeFile, setActiveFile] = useState<"handwritten" | "webassign">("handwritten");

  function handlePdfButton(file: "handwritten" | "webassign") {
    if (pdfVisible && activeFile === file) {
      setPdfVisible(false);
    } else {
      setActiveFile(file);
      setPdfVisible(true);
    }
  }

  // ── Feedback PDF export ───────────────────────────────────────────────────
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  async function handleDownloadPDF() {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const filename = `feedback_${enrollment.student_code}_submission_${submission.submission_number ?? submission.id}.pdf`;
      await html2pdf()
        .set({
          margin: [12, 12, 12, 12],
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(reportRef.current)
        .save();
    } finally {
      setExporting(false);
    }
  }

  // ── Draggable divider ─────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState<number>(DEFAULT_DIVIDER_PCT);
  const isDragging = useRef(false);
  const livePct = useRef(DEFAULT_DIVIDER_PCT);

  useEffect(() => {
    const stored = loadStudentDividerPct();
    livePct.current = stored;
    setLeftPct(stored);
  }, []);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(MAX_PANEL_PCT, Math.max(MIN_PANEL_PCT, pct));
      livePct.current = clamped;
      if (leftPanelRef.current) {
        leftPanelRef.current.style.width = `${clamped}%`;
      }
    }

    function onMouseUp() {
      if (!isDragging.current) return;
      isDragging.current = false;
      localStorage.setItem(STUDENT_DIVIDER_KEY, String(livePct.current));
      setLeftPct(livePct.current);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function onDividerMouseDown(e: React.MouseEvent) {
    isDragging.current = true;
    e.preventDefault();
  }

  const fetchActivePdf = useCallback(
    () => fetchFile(activeFile),
    [fetchFile, activeFile]
  );

  // ── Feedback content ──────────────────────────────────────────────────────
  const feedbackContent = (
    <div ref={reportRef} className="px-6 py-5 space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-blue-600">
          Your Results
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Grading Summary
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Submission #{submission.submission_number ?? "—"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Score</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {rawScore !== undefined && rawMax !== undefined
              ? `${rawScore} / ${rawMax}`
              : submission.score !== null
              ? `${submission.score}%`
              : "—"}
          </p>
        </div>
        <div className="rounded-lg bg-white border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Instructor Review</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {submission.review_required ? "Required" : "Not required"}
          </p>
          {submission.submitted_by_publisher && (
            <p className="mt-1 text-xs text-slate-500">
              Submitted by instructor on your behalf
            </p>
          )}
        </div>
      </div>

      {overallFeedback && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-500 mb-2">Overall Feedback</p>
          <p className="whitespace-pre-wrap text-slate-800">{overallFeedback}</p>
        </div>
      )}

      {reviewReasons.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Review Reasons</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
            {reviewReasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {questions.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">
            Question-Level Feedback
          </p>
          <div className="space-y-3">
            {questions.map((q) => (
              <div key={q.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">Question {q.id}</p>
                    <p className="text-sm text-slate-500">Confidence: {q.confidence}</p>
                    <p className="text-sm text-slate-500">Readability: {q.readability}</p>
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    {q.score ?? "N/A"} / {q.max_score}
                  </p>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Official Answer
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                      {q.official_answer_summary || "N/A"}
                    </p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Your Answer
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                      {q.student_answer_summary || "N/A"}
                    </p>
                  </div>
                </div>

                {q.grading_basis && <GradingBasisPanel basis={q.grading_basis} />}

                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{q.feedback}</p>

                {q.human_review_required && (
                  <p className="mt-3 rounded-md bg-amber-50 p-2 text-sm text-amber-800">
                    Instructor review: {q.human_review_reason || "Review required."}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* Top bar */}
      <header className="shrink-0 flex items-center px-4 h-12 bg-white border-b border-slate-200 gap-3">
        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-800 transition-colors whitespace-nowrap"
        >
          ← Back
        </button>
        <span className="text-slate-300">|</span>
        <p className="text-xs font-medium uppercase tracking-wider text-blue-600 shrink-0">
          Self Assessment Exam
        </p>
        <span className="text-slate-300">|</span>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-slate-800 truncate">
            {enrollment.display_name}
          </span>
          <span className="ml-2 font-mono text-xs text-slate-500">
            {enrollment.student_code}
          </span>
          <span className="ml-2 text-xs text-slate-400">
            · Submission #{submission.submission_number ?? "—"}
          </span>
        </div>

        {/* PDF toggle buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => handlePdfButton("handwritten")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              pdfVisible && activeFile === "handwritten"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Student Answer PDF
          </button>
          <button
            onClick={() => handlePdfButton("webassign")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              pdfVisible && activeFile === "webassign"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Questions PDF
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={exporting}
            className="rounded-md px-3 py-1 text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {exporting ? "Generating…" : "Download Feedback ↓"}
          </button>
        </div>
      </header>

      {/* Content */}
      {pdfVisible ? (
        <div ref={containerRef} className="flex flex-1 min-h-0 select-none">
          <div
            ref={leftPanelRef}
            style={{ width: `${leftPct}%` }}
            className="overflow-y-auto min-w-0 bg-slate-50"
          >
            {feedbackContent}
          </div>

          <div
            onMouseDown={onDividerMouseDown}
            className="w-1.5 shrink-0 bg-slate-200 hover:bg-blue-400 cursor-col-resize transition-colors group"
            title="Drag to resize"
          >
            <div className="h-full flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1 h-1 rounded-full bg-blue-600" />
              ))}
            </div>
          </div>

          <div className="flex-1 min-w-0 overflow-hidden">
            <SAEPdfViewer
              key={`${submission.id}-${activeFile}`}
              fetchPdf={fetchActivePdf}
              label={
                activeFile === "handwritten"
                  ? (submission.handwritten_filename ?? "Student Answer PDF")
                  : (submission.webassign_filename ?? "Questions PDF")
              }
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-slate-50">{feedbackContent}</div>
      )}
    </div>
  );
}

// ── Grading basis panel ───────────────────────────────────────────────────────

function GradingBasisPanel({ basis }: { basis: SAEGradingBasis }) {
  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Grading Basis
      </p>
      <div className="mt-2 grid gap-2 text-sm text-slate-700 md:grid-cols-4">
        <p><span className="font-medium text-slate-900">Understanding:</span> {basis.understanding_level}</p>
        <p><span className="font-medium text-slate-900">Error:</span> {basis.error_severity}</p>
        <p><span className="font-medium text-slate-900">Completeness:</span> {basis.work_completeness}</p>
        <p><span className="font-medium text-slate-900">Recommended:</span> {basis.recommended_credit_percent}%</p>
      </div>
    </div>
  );
}
