"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const API = "http://localhost:8000";

type SubmissionRow = {
  id: string;
  student_code?: string;
  display_name?: string;
  student_net_id?: string;
  student_name?: string;
  version_number: number | null;
  score: number | null;
  raw_max_score: number | null;
  review_required: boolean;
  created_at: string | null;
};

export default function FeedbacksListPage() {
  const { user, token } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    async function fetchAll() {
      setLoading(true);
      setError("");
      try {
        const isSubscriber = user?.role === "subscriber";

        // Subscribers see only their own submissions; publisher/admin see all.
        const url = isSubscriber
          ? `${API}/api/autograder/submissions/me`
          : `${API}/api/autograder/submissions?all_versions=true`;

        console.log(`[DEBUG] feedbacks list: role=${user?.role} fetching ${url}`);

        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) throw new Error((await resp.text()) || "Failed to fetch submissions.");

        const data: SubmissionRow[] = await resp.json();
        console.log(
          `[DEBUG] feedbacks list: received ${data.length} submissions`,
          data.map((s) => s.id)
        );
        setSubmissions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [token, user?.role]);

  const isSubscriber = user?.role === "subscriber";

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">
              {isSubscriber ? "My Submissions" : "All Submissions"}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {isSubscriber ? "My Feedback" : "View Feedbacks"}
            </h1>
            <p className="mt-2 text-slate-600">
              {isSubscriber
                ? "All your placement test submissions, newest first. Click a row to view the full AI feedback."
                : "Every submission across all students, newest first. Click a row to open the full AI feedback report."}
            </p>
          </div>
          <a
            href={isSubscriber ? "/subscriber/marketplace" : "/autograder"}
            className="mt-2 text-sm text-slate-500 hover:underline"
          >
            ← Back
          </a>
        </div>

        <div className="rounded-xl border bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-sm text-slate-600">Loading submissions…</div>
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
                    {!isSubscriber && (
                      <>
                        <th className="px-5 py-3 font-medium">Student Code</th>
                        <th className="px-5 py-3 font-medium">Name</th>
                      </>
                    )}
                    <th className="px-5 py-3 font-medium">Version</th>
                    <th className="px-5 py-3 font-medium">Score</th>
                    <th className="px-5 py-3 font-medium">Review</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s, index) => (
                    <tr
                      key={s.id}
                      className="border-b last:border-0 hover:bg-slate-50 cursor-pointer"
                      onClick={() =>
                        (window.location.href = `/autograder/feedbacks/${s.id}`)
                      }
                    >
                      <td className="px-5 py-4 font-mono text-slate-700 text-xs">{s.student_net_id ?? s.student_code ?? index + 1}</td>
                      {!isSubscriber && (
                        <>
                          <td className="px-5 py-4 font-mono text-slate-900">
                            {s.student_code ?? s.student_net_id ?? "—"}
                          </td>
                          <td className="px-5 py-4 text-slate-900">
                            {s.display_name ?? s.student_name ?? "—"}
                          </td>
                        </>
                      )}
                      <td className="px-5 py-4 text-slate-600">
                        {s.version_number != null ? `v${s.version_number}` : "—"}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {s.score ?? "N/A"}
                        {s.raw_max_score ? `/${s.raw_max_score}` : ""}
                      </td>
                      <td className="px-5 py-4">
                        {s.review_required ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Needed
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-600 text-xs">
                        {s.created_at
                          ? new Date(s.created_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                          View →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-400">
          {submissions.length} submission{submissions.length !== 1 ? "s" : ""} total
        </p>
      </div>
    </main>
  );
}
