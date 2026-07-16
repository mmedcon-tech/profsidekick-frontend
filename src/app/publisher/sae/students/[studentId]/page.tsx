"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SAEPdfViewer from "@/components/sae/SAEPdfViewer";
import {
  fetchPublisherStudentFile,
  fetchPublisherStudentTranscript,
  getStudentDetail,
  updateSubmission,
} from "@/lib/sae-api";
import type {
  SAEGradingBasis,
  SAEGradingQuestion,
  SAEStudentDetail,
  SAESubmissionResultPublisher,
} from "@/types/sae";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type ActiveView = "handwritten" | "webassign" | "transcript";

const DIVIDER_STORAGE_KEY = "sae_review_divider_pct_v2";
const DEFAULT_DIVIDER_PCT = 50;
const MIN_PANEL_PCT = 20;
const MAX_PANEL_PCT = 80;

function loadDividerPct(): number {
  if (typeof window === "undefined") return DEFAULT_DIVIDER_PCT;
  const stored = localStorage.getItem(DIVIDER_STORAGE_KEY);
  const parsed = stored ? parseFloat(stored) : NaN;
  return isNaN(parsed)
    ? DEFAULT_DIVIDER_PCT
    : Math.min(MAX_PANEL_PCT, Math.max(MIN_PANEL_PCT, parsed));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GradingBasisPanel({ basis }: { basis: SAEGradingBasis }) {
  return (
    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Grading Basis
      </p>
      <div className="mt-1 grid gap-1 text-xs text-slate-700 md:grid-cols-4">
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

function FeedbackPanel({
  detail,
  submission,
  isActive,
  onSubmissionUpdated,
}: {
  detail: SAEStudentDetail;
  submission: SAESubmissionResultPublisher;
  isActive: boolean;
  onSubmissionUpdated: (updated: SAESubmissionResultPublisher) => void;
}) {
  const rj = submission.result_json as Record<string, unknown> | null;
  const questions = (rj?.questions ?? []) as SAEGradingQuestion[];
  const rawScore = rj?.raw_score as number | undefined;
  const rawMax = rj?.raw_max_score as number | undefined;
  const overallFeedback = rj?.overall_feedback as string | undefined;
  const reviewReasons = (rj?.submission_review_reasons ?? []) as string[];

  const [editing, setEditing] = useState(false);
  const [editFeedback, setEditFeedback] = useState(overallFeedback ?? "");
  const [editScores, setEditScores] = useState<Record<string, number | null>>(
    Object.fromEntries(questions.map((q) => [q.id, q.score ?? null]))
  );
  const [editQFeedback, setEditQFeedback] = useState<Record<string, string>>(
    Object.fromEntries(questions.map((q) => [q.id, q.feedback ?? ""]))
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  async function handleDownloadPDF() {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const filename = `feedback_${detail.student_code}_submission_${submission.submission_number ?? submission.id}.pdf`;
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

  // Reset edit state when the displayed submission changes
  useEffect(() => {
    setEditing(false);
    setEditFeedback(overallFeedback ?? "");
    setEditScores(Object.fromEntries(questions.map((q) => [q.id, q.score ?? null])));
    setEditQFeedback(Object.fromEntries(questions.map((q) => [q.id, q.feedback ?? ""])));
    setSaveError("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission.id]);

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      const updated = await updateSubmission(detail.id, {
        overall_feedback: editFeedback || undefined,
        questions: questions.map((q) => ({
          id: q.id,
          score: editScores[q.id] ?? undefined,
          feedback: editQFeedback[q.id] || undefined,
        })),
      });
      onSubmissionUpdated(updated);
      setEditing(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    setEditFeedback(overallFeedback ?? "");
    setEditScores(
      Object.fromEntries(questions.map((q) => [q.id, q.score ?? null]))
    );
    setEditQFeedback(
      Object.fromEntries(questions.map((q) => [q.id, q.feedback ?? ""]))
    );
    setSaveError("");
    setEditing(false);
  }

  return (
    <div className="h-full overflow-y-auto">
      <div ref={reportRef} className="px-6 py-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-blue-600">
              Grading Results
            </p>
            <h2 className="mt-0.5 text-lg font-bold text-slate-900">
              {detail.display_name}
            </h2>
            <p className="text-xs text-slate-500 font-mono">{detail.student_code}</p>
            <p className="mt-0.5 text-xs text-slate-400">
              Submitted{" "}
              {new Date(submission.created_at).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              {submission.submitted_by_publisher && " · by instructor"}
            </p>
            {submission.is_edited && (
              <p className="mt-0.5 text-xs text-amber-700">
                Edited
                {submission.last_edited_at
                  ? ` · ${new Date(submission.last_edited_at).toLocaleString("en-US", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}`
                  : ""}
              </p>
            )}
          </div>

          {/* Edit controls — only for the active (most recent) submission */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleDownloadPDF}
              disabled={exporting}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {exporting ? "Generating…" : "Download Feedback ↓"}
            </button>
            {isActive && (
              <>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Edit Grades
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {saveError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {saveError}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Score</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {rawScore !== undefined && rawMax !== undefined
                ? `${rawScore} / ${rawMax}`
                : submission.score !== null
                ? `${submission.score}%`
                : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Human Review</p>
            <p
              className={`mt-1 text-base font-semibold ${
                submission.review_required ? "text-amber-700" : "text-slate-700"
              }`}
            >
              {submission.review_required ? "Required" : "Not required"}
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Overall Feedback
          </p>
          {editing ? (
            <textarea
              value={editFeedback}
              onChange={(e) => setEditFeedback(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-slate-800">
              {overallFeedback ?? (
                <span className="italic text-slate-400">No overall feedback.</span>
              )}
            </p>
          )}
        </div>

        {reviewReasons.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">Review Reasons</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
              {reviewReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {detail.grading_prompt_snapshot && (
          <div className="rounded-lg border border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={() => setPromptExpanded((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Grading Prompt Used
              </p>
              <span className="text-xs text-slate-400">{promptExpanded ? "▲ hide" : "▼ show"}</span>
            </button>
            {promptExpanded && (
              <div className="border-t border-slate-200 px-4 pb-4 pt-3">
                <pre className="whitespace-pre-wrap text-xs text-slate-700 font-mono leading-relaxed max-h-64 overflow-y-auto">
                  {detail.grading_prompt_snapshot}
                </pre>
              </div>
            )}
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">
                        Question {q.id}
                      </p>
                      <p className="text-xs text-slate-500">
                        Confidence: {q.confidence} · Readability: {q.readability}
                      </p>
                    </div>
                    {editing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={q.max_score}
                          step={0.5}
                          value={editScores[q.id] ?? ""}
                          onChange={(e) =>
                            setEditScores((prev) => ({
                              ...prev,
                              [q.id]:
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                            }))
                          }
                          className="w-16 rounded border border-slate-300 px-2 py-1 text-sm text-right focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-sm text-slate-500">
                          / {q.max_score}
                        </span>
                      </div>
                    ) : (
                      <p className="text-base font-bold text-slate-900">
                        {q.score ?? "N/A"} / {q.max_score}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <div className="rounded-md bg-slate-50 p-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Official Answer
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-xs text-slate-800">
                        {q.official_answer_summary || "N/A"}
                      </p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Student Answer
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-xs text-slate-800">
                        {q.student_answer_summary || "N/A"}
                      </p>
                    </div>
                  </div>

                  {q.grading_basis && <GradingBasisPanel basis={q.grading_basis} />}

                  <div className="mt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                      Feedback
                    </p>
                    {editing ? (
                      <textarea
                        value={editQFeedback[q.id] ?? ""}
                        onChange={(e) =>
                          setEditQFeedback((prev) => ({
                            ...prev,
                            [q.id]: e.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-xs text-slate-700">
                        {q.feedback}
                      </p>
                    )}
                  </div>

                  {q.human_review_required && (
                    <p className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
                      Review: {q.human_review_reason || "Required."}
                    </p>
                  )}

                  {submission.comments
                    ?.filter((comment) => comment.question_id === q.id)
                    .map((comment) => (
                      <div
                        key={comment.id}
                        className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                          Student Comment
                        </p>

                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                          {comment.comment}
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          Submitted{" "}
                          {new Date(comment.created_at).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Submission selector ───────────────────────────────────────────────────────

function SubmissionSelector({
  submissions,
  selectedId,
  onSelect,
}: {
  submissions: SAESubmissionResultPublisher[];
  selectedId: string;
  onSelect: (sub: SAESubmissionResultPublisher) => void;
}) {
  // Newest first
  const sorted = [...submissions].sort(
    (a, b) => (b.submission_number ?? 0) - (a.submission_number ?? 0)
  );

  return (
    <div className="shrink-0 px-6 py-3 border-b border-slate-100 bg-white">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
        Submissions
      </p>
      <div className="flex flex-wrap gap-2">
        {sorted.map((sub) => {
          const rj = sub.result_json as Record<string, unknown> | null;
          const rawScore = rj?.raw_score as number | undefined;
          const rawMax = rj?.raw_max_score as number | undefined;
          const scoreDisplay =
            rawScore !== undefined && rawMax !== undefined
              ? `${rawScore}/${rawMax}`
              : sub.score !== null
              ? `${sub.score}%`
              : "—";

          const isSelected = sub.id === selectedId;

          return (
            <button
              key={sub.id}
              onClick={() => onSelect(sub)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors border ${
                isSelected
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              #{sub.submission_number ?? "—"}
              <span className="ml-1.5 opacity-75">{scoreDisplay}</span>
              {sub.is_active && (
                <span
                  className={`ml-1.5 text-xs ${
                    isSelected ? "text-blue-200" : "text-blue-600"
                  }`}
                >
                  · latest
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PublisherStudentReviewPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;

  const [detail, setDetail] = useState<SAEStudentDetail | null>(null);
  const [submissions, setSubmissions] = useState<SAESubmissionResultPublisher[]>([]);
  const [selectedSub, setSelectedSub] = useState<SAESubmissionResultPublisher | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ── View file toggle ─────────────────────────────────────────────────────────────
  const [viewerVisible, setViewerVisible] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("handwritten");

  const [transcriptText, setTranscriptText] = useState("");
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState("");

  function handleViewButton(view: ActiveView) {
    if (viewerVisible && activeView === view) {
      setViewerVisible(false);
      return;
    }

    setActiveView(view);
    setViewerVisible(true);
  }

  useEffect(() => {
    if (!viewerVisible || activeView !== "transcript") return;

    let cancelled = false;

    setTranscriptLoading(true);
    setTranscriptError("");

    fetchPublisherStudentTranscript(studentId)
      .then((text) => {
        if (!cancelled) {
          setTranscriptText(text);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setTranscriptError(
            err instanceof Error
              ? err.message
              : "Could not load transcript."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTranscriptLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, 
  [studentId, activeView, viewerVisible]);

  // ── Draggable divider ──────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState<number>(DEFAULT_DIVIDER_PCT);
  const isDragging = useRef(false);
  const livePct = useRef(DEFAULT_DIVIDER_PCT);

  useEffect(() => {
    const stored = loadDividerPct();
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
      localStorage.setItem(DIVIDER_STORAGE_KEY, String(livePct.current));
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

  // ── Data loading ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    getStudentDetail(studentId)
      .then((d) => {
        setDetail(d);
        setSubmissions(d.submissions);
        // Default selection: most recent (last in oldest-first list = highest submission_number)
        const latest = d.submissions.length > 0
          ? d.submissions[d.submissions.length - 1]
          : null;
        setSelectedSub(latest);
      })
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : "Failed to load student.")
      )
      .finally(() => setLoading(false));
  }, [studentId]);

  function handleSubmissionUpdated(updated: SAESubmissionResultPublisher) {
    setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setSelectedSub(updated);
  }

  const isSelectedActive = selectedSub?.is_active ?? false;

  // PDF only available for the active submission (backend limitation)
  const fetchActivePdf = useCallback(
    () =>
      fetchPublisherStudentFile(
        studentId,
        activeView as "handwritten" | "webassign"
      ),
    [studentId, activeView]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
          <p className="text-sm text-slate-500">Loading submission…</p>
        </div>
      </div>
    );
  }

  if (loadError || !detail) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 p-6 text-center">
        <div>
          <p className="text-base font-semibold text-slate-800">
            Could not load submission
          </p>
          <p className="mt-1 text-sm text-slate-500">{loadError}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            ← Back to student list
          </button>
        </div>
      </div>
    );
  }

  const hasSubmissions = submissions.length > 0;
  const showMultiSelector = submissions.length > 1;

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center px-4 h-12 bg-white border-b border-slate-200 gap-3">
        <button
          onClick={() => router.back()}
          className="text-sm text-slate-500 hover:text-slate-800 transition-colors whitespace-nowrap"
        >
          ← Back
        </button>
        <span className="text-slate-300">|</span>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-slate-800 truncate">
            {detail.display_name}
          </span>
          <span className="ml-2 font-mono text-xs text-slate-500">
            {detail.student_code}
          </span>
          <span className="ml-2 text-xs text-slate-400">
            · {detail.submission_count} submission
            {detail.submission_count !== 1 ? "s" : ""}
          </span>
        </div>

        {/* PDF toggle buttons — only when viewing active submission */}
        {hasSubmissions && isSelectedActive && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleViewButton("handwritten")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                viewerVisible && activeView === "handwritten"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Student Answer PDF
            </button>

            <button
              onClick={() => handleViewButton("webassign")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                viewerVisible && activeView === "webassign"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Questions PDF
            </button>

            <button
              onClick={() => handleViewButton("transcript")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                viewerVisible && activeView === "transcript"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Transcript
            </button>
          </div>
        )}
      </header>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {!hasSubmissions ? (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <p className="text-slate-600 font-medium">No submission yet</p>
            <p className="mt-1 text-sm text-slate-400">
              {detail.display_name} has not submitted their exam.
            </p>
            <button
              onClick={() => router.back()}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              ← Back to student list
            </button>
          </div>
        </div>
      ) : viewerVisible && isSelectedActive ? (
        /* Split pane (PDF only available for active submission) */
        <div ref={containerRef} className="flex flex-1 min-h-0 select-none">
          <div
            ref={leftPanelRef}
            style={{ width: `${leftPct}%` }}
            className="flex flex-col min-h-0 min-w-0"
          >
            {showMultiSelector && selectedSub && (
              <SubmissionSelector
                submissions={submissions}
                selectedId={selectedSub.id}
                onSelect={(s) => { setSelectedSub(s); setViewerVisible(false); }}
              />
            )}
            <FeedbackPanel
              detail={detail}
              submission={selectedSub!}
              isActive={isSelectedActive}
              onSubmissionUpdated={handleSubmissionUpdated}
            />
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
            {activeView === "transcript" ? (
              <div className="h-full overflow-y-auto bg-slate-50 p-6">
                <p className="text-xs font-medium uppercase tracking-wider text-blue-600">
                  OCR Transcript
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Handwritten Transcript
                </h2>

                {transcriptLoading && (
                  <p className="mt-4 text-sm text-slate-500">
                    Loading transcript…
                  </p>
                )}

                {transcriptError && (
                  <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {transcriptError}
                  </div>
                )}

                {!transcriptLoading && !transcriptError && (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-800 shadow-sm">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        table: (props) => (
                          <table
                            className="my-4 w-full border-collapse border border-slate-300"
                            {...props}
                          />
                        ),
                        th: (props) => (
                          <th
                            className="border border-slate-300 bg-slate-100 px-2 py-1 text-left"
                            {...props}
                          />
                        ),
                        td: (props) => (
                          <td
                            className="border border-slate-300 px-2 py-1"
                            {...props}
                          />
                        ),
                      }}
                    >
                      {transcriptText || "No transcript available."}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ) : (
              <SAEPdfViewer
                key={`${studentId}-${activeView}`}
                fetchPdf={fetchActivePdf}
                label={
                  activeView === "handwritten"
                    ? (selectedSub?.handwritten_filename ?? "Student Answer PDF")
                    : (selectedSub?.webassign_filename ?? "Questions PDF")
                }
              />
            )}
          </div>
        </div>
      ) : (
        /* Feedback only */
        <div className="flex-1 min-h-0 flex flex-col">
          {showMultiSelector && selectedSub && (
            <SubmissionSelector
              submissions={submissions}
              selectedId={selectedSub.id}
              onSelect={setSelectedSub}
            />
          )}
          {selectedSub && (
            <>
              {!isSelectedActive && (
                <div className="shrink-0 px-6 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                  Viewing a previous submission. PDFs and grade editing are only available for the most recent submission.
                </div>
              )}
              <div className="flex-1 min-h-0">
                <FeedbackPanel
                  detail={detail}
                  submission={selectedSub}
                  isActive={isSelectedActive}
                  onSubmissionUpdated={handleSubmissionUpdated}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
