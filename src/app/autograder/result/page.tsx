"use client";

import { useEffect, useState } from "react";

type SubmissionSummary = {
  id: string;
  student_id: string;
  student_code: string;
  display_name: string;
  version_number: number | null;
  score: number | null;
  raw_max_score: number | null;
  review_required: boolean;
  created_at: string | null;
};

export default function AutograderResultsPage() {
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchSubmissions() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("auth_token");
      const response = await fetch("http://localhost:8000/api/autograder/submissions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to fetch submissions.");
      }

      const data = await response.json();
      setSubmissions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSubmissions();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Professor View</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Autograder Results</h1>
            <p className="mt-2 text-slate-600">
              Latest submission per student. Review scores and open detailed AI feedback.
            </p>
          </div>
          <a href="/autograder" className="mt-2 text-sm text-slate-500 hover:underline">
            ← Back
          </a>
        </div>

        <div className="rounded-xl border bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-sm text-slate-600">Loading submissions...</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-700">{error}</div>
          ) : submissions.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">No submissions yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-medium">Student Code</th>
                    <th className="px-5 py-3 font-medium">Display Name</th>
                    <th className="px-5 py-3 font-medium">Version #</th>
                    <th className="px-5 py-3 font-medium">Score</th>
                    <th className="px-5 py-3 font-medium">Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-5 py-4 font-mono text-slate-900">
                        {submission.student_code}
                      </td>
                      <td className="px-5 py-4 text-slate-900">{submission.display_name}</td>
                      <td className="px-5 py-4 text-slate-600">
                        {submission.version_number != null ? `v${submission.version_number}` : "—"}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {submission.score ?? "N/A"}
                        {submission.raw_max_score ? `/${submission.raw_max_score}` : ""}
                      </td>
                      <td className="px-5 py-4">
                        <a
                          href={`/autograder/result/${submission.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          View Feedback
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
