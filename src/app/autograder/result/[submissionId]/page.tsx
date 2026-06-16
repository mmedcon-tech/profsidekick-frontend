"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchSubmission() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("auth_token");
      const response = await fetch(`http://localhost:8000/api/autograder/submissions/${submissionId}`,
        {
            headers: {
            Authorization: `Bearer ${token}`,
            },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to fetch submission.");
      }

      const data = await response.json();
      setSubmission(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (submissionId) {
      fetchSubmission();
    }
  }, [submissionId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-5xl text-sm text-slate-600">
          Loading feedback...
        </div>
      </main>
    );
  }

  if (error || !submission) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-5xl rounded-xl border bg-white p-6 text-sm text-red-700">
          {error || "Submission not found."}
        </div>
      </main>
    );
  }

  const result = submission.result_json;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-600">Autograder Feedback</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {submission.student_name}
          </h1>
          <p className="mt-2 text-slate-600">
            NetID: {submission.student_net_id}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Submitted:{" "}
            {submission.created_at
              ? new Date(submission.created_at).toLocaleString()
              : "N/A"}
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Grading Summary
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Score</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {result.raw_score}/{result.raw_max_score}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Human Review</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {result.submission_review_required ? "Required" : "Not required"}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Overall Feedback</p>
              <p className="mt-2 whitespace-pre-wrap text-slate-800">
                {result.overall_feedback}
              </p>
            </div>

            {result.submission_review_reasons.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">
                  Review Reasons
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
                  {result.submission_review_reasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Question-Level Feedback
            </h3>

            <div className="mt-4 space-y-3">
              {result.questions.map((question) => (
                <div
                  key={question.id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        Question {question.id}
                      </p>
                      <p className="text-sm text-slate-500">
                        Confidence: {question.confidence}
                      </p>
                      <p className="text-sm text-slate-500">
                        Readability: {question.readability}
                      </p>
                    </div>

                    <p className="text-lg font-bold text-slate-900">
                      {question.score ?? "N/A"}/{question.max_score}
                    </p>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Official Answer
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                        {question.official_answer_summary || "N/A"}
                        </p>
                    </div>

                  <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Student Answer
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                        {question.student_answer_summary || "N/A"}
                        </p>
                    </div>
                  </div>

                {question.grading_basis && (
                <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Grading Basis
                    </p>

                    <div className="mt-2 grid gap-2 text-sm text-slate-700 md:grid-cols-4">
                    <p>
                        <span className="font-medium text-slate-900">Understanding:</span>{" "}
                        {question.grading_basis.understanding_level}
                    </p>

                    <p>
                        <span className="font-medium text-slate-900">Error:</span>{" "}
                        {question.grading_basis.error_severity}
                    </p>

                    <p>
                        <span className="font-medium text-slate-900">Completeness:</span>{" "}
                        {question.grading_basis.work_completeness}
                    </p>

                    <p>
                        <span className="font-medium text-slate-900">Recommended:</span>{" "}
                        {question.grading_basis.recommended_credit_percent}%
                    </p>
                    </div>
                </div>
                )}

                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                    {question.feedback}
                  </p>

                  {question.human_review_required && (
                    <p className="mt-3 rounded-md bg-amber-50 p-2 text-sm text-amber-800">
                      Human review:{" "}
                      {question.human_review_reason || "Review required."}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}