"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchMySubmissionFile,
  getMyProfile,
  getMySubmissions,
  submitExam,
} from "@/lib/sae-api";
import SAEPdfViewer from "@/components/sae/SAEPdfViewer";
import type {
  SAEGradingBasis,
  SAEGradingQuestion,
  SAEStudentMe,
  SAESubmissionResult,
} from "@/types/sae";

// ── Page state ─────────────────────────────────────────────────────────────────

type PageState =
  | { kind: "loading" }
  | { kind: "not_enrolled" }
  | { kind: "main"; profile: SAEStudentMe; submissions: SAESubmissionResult[] }
  | { kind: "viewing"; profile: SAEStudentMe; submissions: SAESubmissionResult[]; selected: SAESubmissionResult }
  | { kind: "submitting"; profile: SAEStudentMe; submissions: SAESubmissionResult[] };

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

// ── Root page component ────────────────────────────────────────────────────────

export default function SAEExamPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>({ kind: "loading" });
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/login?next=/sae/exam");
      return;
    }

    getMyProfile()
      .then((profile) => {
        if (!profile.is_enrolled) {
          setPageState({ kind: "not_enrolled" });
          return;
        }
        return getMySubmissions().then((submissions) => {
          setPageState({ kind: "main", profile, submissions });
        });
      })
      .catch((err: Error) => {
        if (err.message.includes("401")) {
          router.replace("/login?next=/sae/exam");
        } else {
          // Any other error (403, network, etc.) — treat as not enrolled
          setPageState({ kind: "not_enrolled" });
        }
      });
  }, [router]);

  async function handleSubmit(handwrittenFile: File, webassignFile: File) {
    const { profile, submissions } = pageState as {
      profile: SAEStudentMe;
      submissions: SAESubmissionResult[];
    };
    setPageState({ kind: "submitting", profile, submissions });
    setSubmitError("");
    try {
      const newSub = await submitExam(handwrittenFile, webassignFile);
      const updated = [...submissions, newSub];
      setPageState({ kind: "viewing", profile, submissions: updated, selected: newSub });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed.";
      setSubmitError(msg);
      setPageState({ kind: "main", profile, submissions });
    }
  }

  function handleViewSubmission(selected: SAESubmissionResult) {
    const base = pageState as {
      profile: SAEStudentMe;
      submissions: SAESubmissionResult[];
    };
    setPageState({ kind: "viewing", profile: base.profile, submissions: base.submissions, selected });
  }

  function handleBackFromViewing() {
    const { profile, submissions } = pageState as {
      profile: SAEStudentMe;
      submissions: SAESubmissionResult[];
      selected: SAESubmissionResult;
    };
    setPageState({ kind: "main", profile, submissions });
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

  if (pageState.kind === "submitting") {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          <p className="text-slate-700 font-medium">Grading your exam…</p>
          <p className="mt-1 text-xs text-slate-500">This may take up to 30 seconds.</p>
        </div>
      </div>
    );
  }

  if (pageState.kind === "viewing") {
    const { profile, selected } = pageState;
    const fetchFile = (fileType: "handwritten" | "webassign") =>
      fetchMySubmissionFile(selected.id, fileType);
    return (
      <ResultView
        profile={profile}
        submission={selected}
        fetchFile={fetchFile}
        onBack={handleBackFromViewing}
      />
    );
  }

  // kind === "main"
  const { profile, submissions } = pageState;
  return (
    <MainView
      profile={profile}
      submissions={submissions}
      onSubmit={handleSubmit}
      submitError={submitError}
      onViewSubmission={handleViewSubmission}
    />
  );
}

// ── Not enrolled view ─────────────────────────────────────────────────────────

function NotEnrolledView() {
  return (
    <div className="min-h-full bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-blue-600">
            Self Assessment Exam
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">My Exam</h1>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Submit New Assessment</h2>
          </div>
          <div className="px-6 py-8 text-center">
            <p className="text-sm font-medium text-slate-600">
              You don&apos;t have credits or access to make a submission.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Contact your instructor if you believe this is an error.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">My Submissions</h2>
          </div>
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-slate-500">No submissions yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main view (enrolled student) ──────────────────────────────────────────────

function MainView({
  profile,
  submissions,
  onSubmit,
  submitError,
  onViewSubmission,
}: {
  profile: SAEStudentMe;
  submissions: SAESubmissionResult[];
  onSubmit: (handwritten: File, webassign: File) => void;
  submitError: string;
  onViewSubmission: (sub: SAESubmissionResult) => void;
}) {
  const [handwrittenFile, setHandwrittenFile] = useState<File | null>(null);
  const [webassignFile, setWebassignFile] = useState<File | null>(null);

  const submissionCount = submissions.length;
  const atLimit = submissionCount >= 5;

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!handwrittenFile || !webassignFile) return;
    onSubmit(handwrittenFile, webassignFile);
  }

  // Display newest-first
  const sortedSubmissions = [...submissions].sort(
    (a, b) => (b.submission_number ?? 0) - (a.submission_number ?? 0)
  );

  return (
    <div className="min-h-full bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-blue-600">
            Self Assessment Exam
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">My Exam</h1>
          <p className="mt-1 text-sm text-slate-600">
            Logged in as{" "}
            <span className="font-semibold text-slate-800">
              {profile.display_name}
            </span>{" "}
            <span className="text-slate-400">({profile.student_code})</span>
          </p>
        </div>

        {/* ── Submit section ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-1 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Submit New Assessment
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 pb-3">
              {atLimit
                ? "Maximum submissions reached"
                : `Submission ${submissionCount + 1} of 5 allowed`}
            </p>
          </div>

          {atLimit ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm font-medium text-amber-900">
                You have used all 5 allowed submissions.
              </p>
              <p className="mt-1 text-sm text-amber-800">
                Contact your instructor if you need assistance.
              </p>
            </div>
          ) : (
            <div className="px-6 pb-6 pt-4">
              <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Before you submit
                </p>
                <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                  <li>Upload your handwritten exam as a single PDF.</li>
                  <li>
                    Upload the WebAssign questions PDF your instructor provided.
                  </li>
                </ul>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="rounded-xl border bg-slate-50 p-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Handwritten Exam <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) =>
                      setHandwrittenFile(e.target.files?.[0] ?? null)
                    }
                    className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {handwrittenFile && (
                    <p className="mt-1 text-xs text-green-700">
                      Selected: {handwrittenFile.name}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border bg-slate-50 p-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    WebAssign Questions PDF <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) =>
                      setWebassignFile(e.target.files?.[0] ?? null)
                    }
                    className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {webassignFile && (
                    <p className="mt-1 text-xs text-green-700">
                      Selected: {webassignFile.name}
                    </p>
                  )}
                </div>

                {submitError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!handwrittenFile || !webassignFile}
                  className="w-full rounded-md bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                >
                  Submit Exam
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ── Submissions history ────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              My Submissions
            </h2>
            <span className="text-xs text-slate-500">
              {submissionCount} of 5 used
            </span>
          </div>

          {sortedSubmissions.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-slate-500">No submissions yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sortedSubmissions.map((sub) => {
                const rj = sub.result_json as Record<string, unknown> | null;
                const rawScore = rj?.raw_score as number | undefined;
                const rawMax = rj?.raw_max_score as number | undefined;
                const scoreDisplay =
                  rawScore !== undefined && rawMax !== undefined
                    ? `${rawScore} / ${rawMax}`
                    : sub.score !== null
                    ? `${sub.score}%`
                    : "Grading…";

                return (
                  <li key={sub.id}>
                    <button
                      onClick={() => onViewSubmission(sub)}
                      className="w-full text-left px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          Submission #{sub.submission_number ?? "—"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(sub.created_at).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                          {sub.submitted_by_publisher && " · by instructor"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-slate-900">
                          {scoreDisplay}
                        </p>
                        {sub.review_required && (
                          <p className="text-xs text-amber-700 mt-0.5">
                            Review required
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Result view (full-screen) ─────────────────────────────────────────────────

function ResultView({
  profile,
  submission,
  fetchFile,
  onBack,
}: {
  profile: SAEStudentMe;
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
  const [activeFile, setActiveFile] = useState<"handwritten" | "webassign">(
    "handwritten"
  );

  function handlePdfButton(file: "handwritten" | "webassign") {
    if (pdfVisible && activeFile === file) {
      setPdfVisible(false);
    } else {
      setActiveFile(file);
      setPdfVisible(true);
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
    <div className="px-6 py-5 space-y-5">
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
          <p className="text-sm font-semibold text-slate-500 mb-2">
            Overall Feedback
          </p>
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
              <div
                key={q.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      Question {q.id}
                    </p>
                    <p className="text-sm text-slate-500">
                      Confidence: {q.confidence}
                    </p>
                    <p className="text-sm text-slate-500">
                      Readability: {q.readability}
                    </p>
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

                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                  {q.feedback}
                </p>

                {q.human_review_required && (
                  <p className="mt-3 rounded-md bg-amber-50 p-2 text-sm text-amber-800">
                    Instructor review:{" "}
                    {q.human_review_reason || "Review required."}
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

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
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
            {profile.display_name}
          </span>
          <span className="ml-2 font-mono text-xs text-slate-500">
            {profile.student_code}
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
            Handwritten Solutions
          </button>
          <button
            onClick={() => handlePdfButton("webassign")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              pdfVisible && activeFile === "webassign"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            WebAssign Questions
          </button>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────────────────── */}
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
                  ? (submission.handwritten_filename ?? "Handwritten Solutions")
                  : (submission.webassign_filename ?? "WebAssign Questions")
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
        <p>
          <span className="font-medium text-slate-900">Understanding:</span>{" "}
          {basis.understanding_level}
        </p>
        <p>
          <span className="font-medium text-slate-900">Error:</span>{" "}
          {basis.error_severity}
        </p>
        <p>
          <span className="font-medium text-slate-900">Completeness:</span>{" "}
          {basis.work_completeness}
        </p>
        <p>
          <span className="font-medium text-slate-900">Recommended:</span>{" "}
          {basis.recommended_credit_percent}%
        </p>
      </div>
    </div>
  );
}
