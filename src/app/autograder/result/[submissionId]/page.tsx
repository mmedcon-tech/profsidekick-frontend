"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import SAEPdfViewer from "@/components/sae/SAEPdfViewer";

const API = "http://localhost:8000";

const DIVIDER_STORAGE_KEY = "autograder_result_divider_pct";
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

type GradingBasis = {
  understanding_level: string;
  error_severity: string;
  work_completeness: string;
  recommended_credit_percent: number;
};

type QuestionResult = {
  id: string;
  max_score: number;
  score: number | null;
  readability: string;
  grading_basis?: GradingBasis;
  official_answer_summary: string;
  student_answer_summary: string;
  confidence: string;
  feedback: string;
  grey_areas: string[];
  human_review_required: boolean;
  human_review_reason: string | null;
};

type GradeResult = {
  raw_score: number;
  raw_max_score: number;
  score: number;
  submission_review_required: boolean;
  submission_review_reasons: string[];
  overall_feedback: string;
  questions: QuestionResult[];
};

type SubmissionDetail = {
  id: string;
  student_net_id: string;
  student_name: string;
  score: number | null;
  review_required: boolean;
  created_at: string | null;
  result_json: GradeResult;
};

export default function AutograderFeedbackPage() {
  const params = useParams();
  const submissionId = params.submissionId as string;

  const reportRef = useRef<HTMLDivElement>(null);

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  // ── PDF toggle ─────────────────────────────────────────────────────────────
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

  // ── PDF report export ──────────────────────────────────────────────────────
  async function handleDownloadPDF() {
    if (!reportRef.current || !submission) return;
    setExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const filename = `feedback_${submission.student_net_id}_submission_${submission.id}.pdf`;
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

  // ── Data loading ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!submissionId) return;
    async function fetchSubmission() {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch(`${API}/api/autograder/submissions/${submissionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to fetch submission.");
        }
        setSubmission(await response.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }
    fetchSubmission();
  }, [submissionId]);

  const fetchActivePdf = useCallback(async () => {
    const token = localStorage.getItem("auth_token") ?? "";
    const res = await fetch(
      `${API}/api/autograder/submissions/${submissionId}/files/${activeFile}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.arrayBuffer();
  }, [submissionId, activeFile]);

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
          <p className="text-sm text-slate-500">Loading feedback…</p>
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-sm">
          <p className="text-base font-semibold text-slate-800">Could not load submission</p>
          <p className="mt-1 text-sm text-slate-500">{error || "Submission not found."}</p>
          <a href="/autograder" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
            ← Back
          </a>
        </div>
      </div>
    );
  }

  const result = submission.result_json;

  // ── Feedback content ───────────────────────────────────────────────────────
  const feedbackContent = (
    <div ref={reportRef} className="px-6 py-5 space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-blue-600">Autograder Feedback</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{submission.student_name}</h1>
        <p className="mt-0.5 text-sm text-slate-600">NetID: {submission.student_net_id}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          Submitted{" "}
          {submission.created_at
            ? new Date(submission.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
            : "N/A"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Score</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {result.raw_score}/{result.raw_max_score}
          </p>
        </div>
        <div className="rounded-lg bg-white border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Human Review</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {result.submission_review_required ? "Required" : "Not required"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-500 mb-2">Overall Feedback</p>
        <p className="whitespace-pre-wrap text-slate-800">{result.overall_feedback}</p>
      </div>

      {result.submission_review_reasons.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Review Reasons</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
            {result.submission_review_reasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">Question-Level Feedback</p>
        <div className="space-y-3">
          {result.questions.map((question) => (
            <div key={question.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">Question {question.id}</p>
                  <p className="text-sm text-slate-500">Confidence: {question.confidence}</p>
                  <p className="text-sm text-slate-500">Readability: {question.readability}</p>
                </div>
                <p className="text-lg font-bold text-slate-900">
                  {question.score ?? "N/A"}/{question.max_score}
                </p>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Official Answer</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{question.official_answer_summary || "N/A"}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Student Answer</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{question.student_answer_summary || "N/A"}</p>
                </div>
              </div>

              {question.grading_basis && (
                <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Grading Basis</p>
                  <div className="mt-2 grid gap-2 text-sm text-slate-700 md:grid-cols-4">
                    <p><span className="font-medium text-slate-900">Understanding:</span> {question.grading_basis.understanding_level}</p>
                    <p><span className="font-medium text-slate-900">Error:</span> {question.grading_basis.error_severity}</p>
                    <p><span className="font-medium text-slate-900">Completeness:</span> {question.grading_basis.work_completeness}</p>
                    <p><span className="font-medium text-slate-900">Recommended:</span> {question.grading_basis.recommended_credit_percent}%</p>
                  </div>
                </div>
              )}

              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{question.feedback}</p>

              {question.grey_areas && question.grey_areas.length > 0 && (
                <div className="mt-3 rounded-md border border-slate-100 bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Grey Areas</p>
                  <ul className="mt-1 list-disc pl-4 text-sm text-slate-600">
                    {question.grey_areas.map((area, i) => <li key={i}>{area}</li>)}
                  </ul>
                </div>
              )}

              {question.human_review_required && (
                <p className="mt-3 rounded-md bg-amber-50 p-2 text-sm text-amber-800">
                  Human review: {question.human_review_reason || "Review required."}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center px-4 h-12 bg-white border-b border-slate-200 gap-3">
        <a href="/autograder" className="text-sm text-slate-500 hover:text-slate-800 transition-colors whitespace-nowrap">
          ← Back
        </a>
        <span className="text-slate-300">|</span>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-slate-800 truncate">{submission.student_name}</span>
          <span className="ml-2 font-mono text-xs text-slate-500">{submission.student_net_id}</span>
        </div>

        {/* PDF report export */}
        <button
          onClick={handleDownloadPDF}
          disabled={exporting}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exporting ? "Generating…" : "Download PDF ↓"}
        </button>

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
            Handwritten Solution
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

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {pdfVisible ? (
        <div ref={containerRef} className="flex flex-1 min-h-0 select-none">
          <div ref={leftPanelRef} style={{ width: `${leftPct}%` }} className="overflow-y-auto min-w-0 bg-slate-50">
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
              key={`${submissionId}-${activeFile}`}
              fetchPdf={fetchActivePdf}
              label={activeFile === "handwritten" ? "Handwritten Solution" : "WebAssign Questions"}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {feedbackContent}
        </div>
      )}
    </div>
  );
}
