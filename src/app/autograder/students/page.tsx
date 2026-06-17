"use client";

import { useEffect, useState } from "react";

const API = "http://localhost:8000";

type Student = {
  student_id: string;
  student_code: string;
  display_name: string;
  created_at: string | null;
};

type LatestSubmission = {
  version_number: number;
  created_at: string | null;
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [latestByStudent, setLatestByStudent] = useState<Record<string, LatestSubmission>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New student form
  const [displayName, setDisplayName] = useState("");
  const [createStatus, setCreateStatus] = useState<"idle" | "loading" | "error">("idle");
  const [createError, setCreateError] = useState("");
  const [newStudentCode, setNewStudentCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  function getToken() {
    return localStorage.getItem("auth_token") ?? "";
  }

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${getToken()}` };
      const [studentsResp, submissionsResp] = await Promise.all([
        fetch(`${API}/api/autograder/students`, { headers }),
        fetch(`${API}/api/autograder/submissions`, { headers }),
      ]);

      if (!studentsResp.ok) throw new Error("Failed to load students.");
      const studentsData: Student[] = await studentsResp.json();
      setStudents(studentsData);

      if (submissionsResp.ok) {
        const submissionsData = await submissionsResp.json();
        const map: Record<string, LatestSubmission> = {};
        for (const s of submissionsData) {
          if (s.student_id) {
            map[s.student_id] = {
              version_number: s.version_number ?? 0,
              created_at: s.created_at,
            };
          }
        }
        setLatestByStudent(map);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleCreateStudent() {
    const name = displayName.trim();
    if (!name) return;
    setCreateStatus("loading");
    setCreateError("");
    setNewStudentCode("");
    setCodeCopied(false);
    try {
      const resp = await fetch(`${API}/api/autograder/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ display_name: name }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setNewStudentCode(data.student_code);
      setDisplayName("");
      setCreateStatus("idle");
      fetchData();
    } catch (err) {
      setCreateStatus("error");
      setCreateError(err instanceof Error ? err.message : "Create failed.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Operator View</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Student Management</h1>
            <p className="mt-2 text-slate-600">
              Create students and view their submission history.
            </p>
          </div>
          <a href="/autograder" className="mt-2 text-sm text-slate-500 hover:underline">
            ← Back
          </a>
        </div>

        {/* New student form */}
        <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Add New Student</h2>
          <div className="mt-3 flex gap-2">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateStudent()}
              placeholder="Display name (e.g. Alice Chen)"
              className="flex-1 rounded-md border border-slate-300 p-2.5 text-sm"
            />
            <button
              onClick={handleCreateStudent}
              disabled={createStatus === "loading" || !displayName.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {createStatus === "loading" ? "Creating…" : "Create"}
            </button>
          </div>

          {createStatus === "error" && (
            <p className="mt-2 text-sm text-red-600">{createError}</p>
          )}

          {newStudentCode && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-sm text-green-800">
                Student created:{" "}
                <span className="font-mono text-base font-bold">{newStudentCode}</span>
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newStudentCode);
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2000);
                }}
                className="rounded border border-green-300 bg-green-100 px-2 py-1 text-xs text-green-800 hover:bg-green-200"
              >
                {codeCopied ? "Copied!" : "Copy Code"}
              </button>
            </div>
          )}
        </div>

        {/* Students table */}
        <div className="rounded-xl border bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-sm text-slate-600">Loading students…</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-700">{error}</div>
          ) : students.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">
              No students yet. Create one above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-medium">Student Code</th>
                    <th className="px-5 py-3 font-medium">Display Name</th>
                    <th className="px-5 py-3 font-medium">Submissions</th>
                    <th className="px-5 py-3 font-medium">Last Submitted</th>
                    <th className="px-5 py-3 font-medium">History</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const latest = latestByStudent[student.student_id];
                    return (
                      <tr
                        key={student.student_id}
                        className="border-b last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-mono text-slate-900">
                          {student.student_code}
                        </td>
                        <td className="px-5 py-4 text-slate-900">{student.display_name}</td>
                        <td className="px-5 py-4 text-slate-600">
                          {latest?.version_number ?? 0}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {latest?.created_at
                            ? new Date(latest.created_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-5 py-4">
                          <a
                            href={`/autograder/students/${student.student_id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View History →
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
