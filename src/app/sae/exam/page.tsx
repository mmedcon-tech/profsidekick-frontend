"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMyProfile,
  getMySubmission,
  submitExam,
} from "@/lib/sae-api";
import type { SAEStudentMe, SAESubmissionResult, SAEGradingQuestion } from "@/types/sae";

type PageState =
  | { kind: "loading" }
  | { kind: "unauthorized"; reason: string }
  | { kind: "ready"; profile: SAEStudentMe }
  | { kind: "already_submitted"; profile: SAEStudentMe; submission: SAESubmissionResult }
  | { kind: "submitting"; profile: SAEStudentMe }
  | { kind: "result"; profile: SAEStudentMe; submission: SAESubmissionResult };

export default function SAEExamPage() {
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>({ kind: "loading" });
  const [handwrittenFile, setHandwrittenFile] = useState<File | null>(null);
  const [webassignFile, setWebassignFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/login?next=/sae/exam");
      return;
    }

    // First check if the user is an SAE student
    getMyProfile()
      .then((profile) => {
        // Then check if they already submitted
        return getMySubmission()
          .then((submission) => {
            setPageState({ kind: "already_submitted", profile, submission });
          })
          .catch((err: Error) => {
            if (err.message.includes("404") || err.message.toLowerCase().includes("not submitted")) {
              setPageState({ kind: "ready", profile });
            } else {
              throw err;
            }
          });
      })
      .catch((err: Error) => {
        if (err.message.includes("403") || err.message.toLowerCase().includes("not registered")) {
          setPageState({ kind: "unauthorized", reason: "This account is not registered for the Self Assessment Exam. Contact your instructor." });
        } else if (err.message.includes("401")) {
          router.replace("/login?next=/sae/exam");
        } else {
          setPageState({ kind: "unauthorized", reason: err.message });
        }
      });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");

    if (!handwrittenFile || !webassignFile) return;

    const profile = (pageState as { profile: SAEStudentMe }).profile;
    setPageState({ kind: "submitting", profile });

    try {
      const submission = await submitExam(handwrittenFile, webassignFile);
      setPageState({ kind: "result", profile, submission });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed.";
      setSubmitError(msg);
      setPageState({ kind: "ready", profile });
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (pageState.kind === "loading") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Loading exam…</p>
      </main>
    );
  }

  // ── Not authorised ───────────────────────────────────────────────────────────
  if (pageState.kind === "unauthorized") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-amber-200 bg-white p-8 shadow-sm text-center">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">
            Access Denied
          </h1>
          <p className="text-sm text-slate-600">{pageState.reason}</p>
        </div>
      </main>
    );
  }

  // ── Already submitted — show results ─────────────────────────────────────────
  if (pageState.kind === "already_submitted" || pageState.kind === "result") {
    const { profile, submission } = pageState as { profile: SAEStudentMe; submission: SAESubmissionResult };
    return <ResultView profile={profile} submission={submission} />;
  }

  // ── Submission in progress ───────────────────────────────────────────────────
  if (pageState.kind === "submitting") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          <p className="text-slate-700 font-medium">Grading your exam…</p>
          <p className="mt-1 text-xs text-slate-500">This may take up to 30 seconds.</p>
        </div>
      </main>
    );
  }

  // ── Upload form ──────────────────────────────────────────────────────────────
  const profile = pageState.profile;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-600">
            Self Assessment Exam
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Submit Your Work
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Logged in as{" "}
            <span className="font-semibold text-slate-800">{profile.display_name}</span>{" "}
            <span className="text-slate-400">({profile.student_code})</span>
          </p>
        </div>

        {/* Instructions */}
        <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900 mb-1">Before you submit</p>
          <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
            <li>You may only submit once. Submissions cannot be changed afterward.</li>
            <li>Upload your handwritten exam as a single PDF.</li>
            <li>Upload the WebAssign questions PDF your instructor provided.</li>
          </ul>
        </div>

        {/* Upload form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Handwritten Exam <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setHandwrittenFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600
                         file:mr-4 file:rounded-md file:border-0
                         file:bg-blue-50 file:px-4 file:py-2
                         file:text-sm file:font-medium file:text-blue-700
                         hover:file:bg-blue-100"
            />
            {handwrittenFile && (
              <p className="mt-1 text-xs text-green-700">
                Selected: {handwrittenFile.name}
              </p>
            )}
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              WebAssign Questions PDF <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setWebassignFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600
                         file:mr-4 file:rounded-md file:border-0
                         file:bg-blue-50 file:px-4 file:py-2
                         file:text-sm file:font-medium file:text-blue-700
                         hover:file:bg-blue-100"
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
            className="w-full rounded-md bg-blue-600 py-3 text-sm font-semibold text-white
                       hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60
                       transition-colors"
          >
            Submit Exam
          </button>

          <p className="text-center text-xs text-slate-400">
            Once submitted, your work is final.
          </p>
        </form>
      </div>
    </main>
  );
}

// ── Result panel ──────────────────────────────────────────────────────────────

function ResultView({
  profile,
  submission,
}: {
  profile: SAEStudentMe;
  submission: SAESubmissionResult;
}) {
  const rj = submission.result_json as Record<string, unknown> | null;
  const questions = (rj?.questions ?? []) as SAEGradingQuestion[];
  const score = submission.score;
  const rawMax = rj?.raw_max_score as number | undefined;
  const rawScore = rj?.raw_score as number | undefined;
  const overallFeedback = rj?.overall_feedback as string | undefined;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* Header */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-blue-600">
            Self Assessment Exam
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Your Results
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {profile.display_name} — {profile.student_code}
          </p>
        </div>

        {/* Score card */}
        <div className="rounded-xl border bg-white p-6 shadow-sm flex items-center gap-6">
          <div className="text-center">
            <p className="text-5xl font-bold text-slate-900">
              {score !== null ? `${score}%` : "—"}
            </p>
            {rawScore !== undefined && rawMax !== undefined && (
              <p className="mt-1 text-sm text-slate-500">
                {rawScore} / {rawMax} points
              </p>
            )}
          </div>
          <div className="flex-1">
            {submission.review_required && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 mb-2">
                Flagged for instructor review
              </div>
            )}
            {submission.submitted_by_publisher && (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 mb-2">
                Submitted by instructor on your behalf
              </div>
            )}
            {overallFeedback && (
              <p className="text-sm text-slate-700 leading-relaxed">{overallFeedback}</p>
            )}
          </div>
        </div>

        {/* Per-question breakdown */}
        {questions.length > 0 && (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">
              Question Breakdown
            </h2>
            <div className="space-y-3">
              {questions.map((q) => (
                <div
                  key={q.num}
                  className={`rounded-lg p-3 text-sm border ${
                    q.status === "correct"
                      ? "border-green-200 bg-green-50"
                      : q.status === "partial"
                      ? "border-yellow-200 bg-yellow-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-semibold uppercase ${
                        q.status === "correct"
                          ? "text-green-700"
                          : q.status === "partial"
                          ? "text-yellow-700"
                          : "text-red-700"
                      }`}
                    >
                      Q{q.num} — {q.status}
                    </span>
                  </div>
                  <p className="text-slate-700 text-xs leading-relaxed">{q.feedback}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400">
          Submitted on{" "}
          {new Date(submission.created_at).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>
    </main>
  );
}
