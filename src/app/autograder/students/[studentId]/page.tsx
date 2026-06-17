"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API = "http://localhost:8000";

type StudentInfo = {
  student_id: string;
  student_code: string;
  display_name: string;
};

type SubmissionVersion = {
  submission_id: string;
  version_number: number;
  score: number | null;
  review_required: boolean;
  created_at: string | null;
};

export default function StudentHistoryPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;

  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function getToken() {
    return localStorage.getItem("auth_token") ?? "";
  }

  useEffect(() => {
    if (!studentId) return;

    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const headers = { Authorization: `Bearer ${getToken()}` };
        const [studentResp, submissionsResp] = await Promise.all([
          fetch(`${API}/api/autograder/students/${studentId}`, { headers }),
          fetch(`${API}/api/autograder/students/${studentId}/submissions`, { headers }),
        ]);

        if (!studentResp.ok) throw new Error("Student not found.");
        const studentData = await studentResp.json();
        setStudent(studentData);

        if (submissionsResp.ok) {
          setSubmissions(await submissionsResp.json());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [studentId]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <a
            href="/autograder/students"
            className="text-sm text-slate-500 hover:underline"
          >
            ← Back to Students
          </a>

          {student && (
            <div className="mt-4">
              <p className="text-sm font-medium text-blue-600">Submission History</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">
                {student.display_name}
              </h1>
              <p className="mt-1 font-mono text-lg text-slate-500">{student.student_code}</p>
            </div>
          )}
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
                    <th className="px-5 py-3 font-medium">Version</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Score</th>
                    <th className="px-5 py-3 font-medium">Review Flag</th>
                    <th className="px-5 py-3 font-medium">Report</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr
                      key={s.submission_id}
                      className="border-b last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        v{s.version_number}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {s.created_at
                          ? new Date(s.created_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-900">
                        {s.score ?? "N/A"}
                      </td>
                      <td className="px-5 py-4">
                        {s.review_required ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Review needed
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <a
                          href={`/autograder/result/${s.submission_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          View Report
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
