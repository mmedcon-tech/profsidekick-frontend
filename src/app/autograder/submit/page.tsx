"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API = "http://localhost:8000";

type ResolvedStudent = {
  student_id: string;
  student_code: string;
  display_name: string;
};

export default function AutograderSubmitPage() {
  const router = useRouter();

  // Step 1 — student lookup
  const [codeInput, setCodeInput] = useState("");
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "error">("idle");
  const [lookupError, setLookupError] = useState("");
  const [resolved, setResolved] = useState<ResolvedStudent | null>(null);

  // New student inline form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [createStatus, setCreateStatus] = useState<"idle" | "loading" | "error">("idle");
  const [createError, setCreateError] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  // Step 2 — files
  const [handwrittenFile, setHandwrittenFile] = useState<File | null>(null);
  const [webassignFile, setWebassignFile] = useState<File | null>(null);

  // Step 3 — submission
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "error">("idle");
  const [submitError, setSubmitError] = useState("");

  function getToken() {
    return localStorage.getItem("auth_token") ?? "";
  }

  async function handleLookup() {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setLookupStatus("loading");
    setLookupError("");
    setResolved(null);
    try {
      const resp = await fetch(
        `${API}/api/autograder/students?code=${encodeURIComponent(code)}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (resp.status === 404) {
        setLookupStatus("error");
        setLookupError(`Student code "${code}" not found.`);
        return;
      }
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setResolved({
        student_id: data.student_id,
        student_code: data.student_code,
        display_name: data.display_name,
      });
      setLookupStatus("idle");
    } catch (err) {
      setLookupStatus("error");
      setLookupError(err instanceof Error ? err.message : "Lookup failed.");
    }
  }

  async function handleCreateStudent() {
    const name = newDisplayName.trim();
    if (!name) return;
    setCreateStatus("loading");
    setCreateError("");
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
      setCreatedCode(data.student_code);
      setResolved({
        student_id: data.student_id,
        student_code: data.student_code,
        display_name: data.display_name,
      });
      setShowNewForm(false);
      setNewDisplayName("");
      setCreateStatus("idle");
    } catch (err) {
      setCreateStatus("error");
      setCreateError(err instanceof Error ? err.message : "Create failed.");
    }
  }

  async function handleSubmit() {
    if (!resolved) return;
    if (!handwrittenFile || !webassignFile) {
      setSubmitError("Both PDF files are required.");
      return;
    }
    setSubmitStatus("loading");
    setSubmitError("");
    const formData = new FormData();
    formData.append("student_id", resolved.student_id);
    formData.append("student_answer", handwrittenFile);
    formData.append("webassign_pdf", webassignFile);
    try {
      const resp = await fetch(`${API}/api/autograder/grade`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      router.push(`/autograder/result/${data.submission_id}`);
    } catch (err) {
      setSubmitStatus("error");
      setSubmitError(err instanceof Error ? err.message : "Grading failed.");
    }
  }

  function handleReset() {
    setResolved(null);
    setCodeInput("");
    setLookupStatus("idle");
    setLookupError("");
    setCreatedCode("");
    setCodeCopied(false);
    setShowNewForm(false);
    setNewDisplayName("");
    setHandwrittenFile(null);
    setWebassignFile(null);
    setSubmitStatus("idle");
    setSubmitError("");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-600">Math Placement Test</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Grade Submission</h1>
          <p className="mt-2 text-slate-600">
            Look up a student by code, then upload their work for AI grading.
          </p>
        </div>

        {/* ── Step 1: Student identification ── */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Step 1 — Identify Student
          </h2>

          {!resolved ? (
            <div className="mt-4 space-y-4">
              <div className="flex gap-2">
                <input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  placeholder="Student Code (e.g. STU-001)"
                  className="flex-1 rounded-md border border-slate-300 p-3 text-sm"
                />
                <button
                  onClick={handleLookup}
                  disabled={lookupStatus === "loading" || !codeInput.trim()}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {lookupStatus === "loading" ? "Looking up…" : "Lookup"}
                </button>
              </div>

              {lookupStatus === "error" && (
                <p className="text-sm text-red-600">{lookupError}</p>
              )}

              {/* New student toggle */}
              {!showNewForm && (
                <button
                  onClick={() => setShowNewForm(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  New student instead →
                </button>
              )}

              {showNewForm && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="text-sm font-medium text-slate-700">Create new student</p>
                  <input
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateStudent()}
                    placeholder="Display name (e.g. Alice Chen)"
                    className="w-full rounded-md border border-slate-300 p-2.5 text-sm"
                  />
                  {createStatus === "error" && (
                    <p className="text-sm text-red-600">{createError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateStudent}
                      disabled={createStatus === "loading" || !newDisplayName.trim()}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {createStatus === "loading" ? "Creating…" : "Create Student"}
                    </button>
                    <button
                      onClick={() => { setShowNewForm(false); setCreateError(""); }}
                      className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="flex items-start justify-between rounded-lg border border-green-200 bg-green-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    {resolved.student_code} — {resolved.display_name}
                  </p>
                  <p className="mt-0.5 text-xs text-green-700">Student confirmed</p>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-slate-500 underline hover:text-slate-700"
                >
                  Change
                </button>
              </div>

              {/* Show generated code banner after inline creation */}
              {createdCode && (
                <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-sm text-blue-800">
                    New student code:{" "}
                    <span className="font-mono font-bold">{createdCode}</span>
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdCode);
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 2000);
                    }}
                    className="ml-4 rounded border border-blue-300 bg-blue-100 px-2 py-1 text-xs text-blue-800 hover:bg-blue-200"
                  >
                    {codeCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Step 2: File uploads (shown after student resolved) ── */}
        {resolved && (
          <div className="mt-4 rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Step 2 — Upload Work
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Handwritten Solution (PDF){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setHandwrittenFile(e.target.files?.[0] ?? null)}
                  className="mt-2 block w-full rounded-md border border-slate-300 p-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  WebAssign Questions (PDF){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setWebassignFile(e.target.files?.[0] ?? null)}
                  className="mt-2 block w-full rounded-md border border-slate-300 p-2 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Submit ── */}
        {resolved && (
          <div className="mt-4 rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Step 3 — Grade
            </h2>

            {submitStatus === "error" && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitStatus === "loading" || !handwrittenFile || !webassignFile}
              className="mt-4 rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitStatus === "loading"
                ? "Grading… (this may take ~30s)"
                : "Submit for Grading"}
            </button>

            <p className="mt-2 text-xs text-slate-500">
              You will be redirected to the report automatically when grading completes.
            </p>
          </div>
        )}

        <div className="mt-6">
          <a href="/autograder" className="text-sm text-slate-500 hover:underline">
            ← Back to Autograder
          </a>
        </div>
      </div>
    </main>
  );
}
