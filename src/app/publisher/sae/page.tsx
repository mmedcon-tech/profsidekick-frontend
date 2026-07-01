"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createStudentBatch,
  listStudents,
  regenerateStudentAccess,
  submitOnBehalf,
} from "@/lib/sae-api";
import type { SAEStudentRow } from "@/types/sae";

// ── Types ─────────────────────────────────────────────────────────────────────

type Toast = { id: number; text: string; kind: "success" | "error" };

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ on, labelOn, labelOff }: { on: boolean; labelOn: string; labelOff: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
        ${on ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}`}
    >
      {on ? labelOn : labelOff}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PublisherSAEPage() {
  const router = useRouter();

  const [students, setStudents] = useState<SAEStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);

  // Generate batch state
  const [showGenerate, setShowGenerate] = useState(false);
  const [genCount, setGenCount] = useState<number | "">("");
  const [genDays, setGenDays] = useState<number | "">("");
  const [generating, setGenerating] = useState(false);

  // New-batch result banner
  const [newBatch, setNewBatch] = useState<SAEStudentRow[] | null>(null);

  // Submit-on-behalf modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [soStudent, setSoStudent] = useState<SAEStudentRow | null>(null);
  const [hwFile, setHwFile] = useState<File | null>(null);
  const [waFile, setWaFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Regenerate-access modal
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenStudent, setRegenStudent] = useState<SAEStudentRow | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenUrl, setRegenUrl] = useState<string | null>(null);

  function toast(text: string, kind: "success" | "error" = "success") {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, text, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  // Initial load
  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents(q?: string) {
    setLoading(true);
    try {
      const data = await listStudents(q);
      setStudents(data);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to load students.", "error");
    } finally {
      setLoading(false);
    }
  }

  // Search with debounce
  useEffect(() => {
    const t = setTimeout(() => loadStudents(search || undefined), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Generate batch
  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!genCount || Number(genCount) < 1) return;
    setGenerating(true);
    try {
      const res = await createStudentBatch(
        Number(genCount),
        genDays ? Number(genDays) : undefined
      );
      setNewBatch(res.students);
      setStudents((prev) => [...res.students, ...prev]);
      setShowGenerate(false);
      setGenCount("");
      setGenDays("");
      toast(`${res.total_created} student(s) generated.`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Generation failed.", "error");
    } finally {
      setGenerating(false);
    }
  }

  // Submit on behalf
  function openSubmitModal(student: SAEStudentRow) {
    setSoStudent(student);
    setHwFile(null);
    setWaFile(null);
    setSubmitError("");
    setShowSubmitModal(true);
  }

  async function handleSubmitOnBehalf(e: React.FormEvent) {
    e.preventDefault();
    if (!soStudent || !hwFile || !waFile) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await submitOnBehalf(soStudent.id, hwFile, waFile);
      toast(`Submission for ${soStudent.display_name} saved.`);
      setShowSubmitModal(false);
      loadStudents(search || undefined);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function openRegenModal(student: SAEStudentRow) {
    setRegenStudent(student);
    setRegenUrl(null);
    setShowRegenModal(true);
  }

  async function handleRegenerate() {
    if (!regenStudent) return;
    setRegenerating(true);
    try {
      const res = await regenerateStudentAccess(regenStudent.id);
      setRegenUrl(res.invitation_url);
      loadStudents(search || undefined);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Regeneration failed.", "error");
      setShowRegenModal(false);
    } finally {
      setRegenerating(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => toast(`${label} copied.`));
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-50">

      {/* Toast stack */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg
              ${t.kind === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
          >
            {t.text}
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* Page header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-blue-600">
              Publisher Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Self Assessment Exam
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage pre-generated student slots and their submissions.
            </p>
          </div>
          <button
            onClick={() => setShowGenerate(true)}
            className="shrink-0 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold
                       text-white hover:bg-blue-700 transition-colors"
          >
            + Generate Students
          </button>
        </div>

        {/* New batch banner */}
        {newBatch && newBatch.length > 0 && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-blue-900">
                {newBatch.length} new student(s) generated — copy their invitation links below
              </p>
              <button
                onClick={() => setNewBatch(null)}
                className="text-xs text-blue-600 hover:underline"
              >
                Dismiss
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {newBatch.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg bg-white border
                             border-blue-100 px-3 py-2 gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-mono font-semibold text-slate-700">
                      {s.student_code}
                    </span>
                    <span className="ml-2 text-xs text-slate-500 truncate max-w-xs inline-block align-bottom">
                      {s.invitation_url}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(s.invitation_url, s.student_code)}
                    className="shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-1
                               text-xs text-blue-800 hover:bg-blue-200 whitespace-nowrap"
                  >
                    Copy link
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student code or name…"
            className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm
                       focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-400">
              Loading…
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <p className="text-sm">No students yet.</p>
              <button
                onClick={() => setShowGenerate(true)}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Generate your first batch
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Invitation</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Submission</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{s.student_number}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{s.display_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.student_code}</td>
                    <td className="px-4 py-3">
                      <StatusBadge on={s.is_activated} labelOn="Activated" labelOff="Not activated" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge on={s.submission_count > 0} labelOn="Submitted" labelOff="Pending" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {!s.is_activated && s.invitation_url && (
                          <button
                            onClick={() => copyToClipboard(s.invitation_url, s.student_code)}
                            className="rounded border border-slate-200 px-2.5 py-1 text-xs
                                       text-slate-600 hover:bg-slate-100"
                          >
                            Copy link
                          </button>
                        )}
                        {s.is_activated && (
                          <button
                            onClick={() => openRegenModal(s)}
                            className="rounded border border-amber-200 bg-amber-50 px-2.5 py-1
                                       text-xs text-amber-700 hover:bg-amber-100"
                          >
                            Regenerate link
                          </button>
                        )}
                        {s.submission_count > 0 && (
                          <button
                            onClick={() => router.push(`/publisher/sae/students/${s.id}`)}
                            className="rounded border border-blue-200 bg-blue-50 px-2.5 py-1
                                       text-xs text-blue-700 hover:bg-blue-100"
                          >
                            Review
                          </button>
                        )}
                        {s.submission_count < 5 && (
                          <button
                            onClick={() => openSubmitModal(s)}
                            className="rounded border border-slate-200 px-2.5 py-1 text-xs
                                       text-slate-600 hover:bg-slate-100"
                          >
                            Submit for
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-3 text-xs text-slate-400">
          {students.length} student{students.length !== 1 ? "s" : ""} shown
        </p>
      </div>

      {/* ── Generate modal ─────────────────────────────────────────────────── */}
      {showGenerate && (
        <Modal title="Generate Student Slots" onClose={() => setShowGenerate(false)}>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Number of students to generate
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={genCount}
                onChange={(e) => setGenCount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 20"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                           focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-slate-400">
                New slots are added to the existing pool — existing students are not affected.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Link expiry (days) — optional
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={genDays}
                onChange={(e) => setGenDays(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Leave blank for no expiry"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                           focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={generating || !genCount}
                className="flex-1 rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white
                           hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {generating ? "Generating…" : "Generate"}
              </button>
              <button
                type="button"
                onClick={() => setShowGenerate(false)}
                className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm text-slate-600
                           hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Regenerate access modal ───────────────────────────────────────── */}
      {showRegenModal && regenStudent && (
        <Modal
          title="Regenerate Access Link"
          onClose={() => { setShowRegenModal(false); setRegenUrl(null); }}
        >
          {regenUrl ? (
            /* Step 2 — show the new link */
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                A new link has been generated for{" "}
                <span className="font-semibold">{regenStudent.display_name}</span>.
                The student&apos;s previous login is now invalid.
              </p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 break-all
                              text-xs font-mono text-slate-700">
                {regenUrl}
              </div>
              <button
                onClick={() => {
                  copyToClipboard(regenUrl, regenStudent.student_code);
                }}
                className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white
                           hover:bg-blue-700"
              >
                Copy link
              </button>
              <button
                onClick={() => { setShowRegenModal(false); setRegenUrl(null); }}
                className="w-full rounded-md border border-slate-300 py-2.5 text-sm text-slate-600
                           hover:bg-slate-50"
              >
                Done
              </button>
            </div>
          ) : (
            /* Step 1 — confirmation */
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                This will reset{" "}
                <span className="font-semibold">{regenStudent.display_name}</span>&apos;s
                login credentials. They will not be able to sign in until they
                use the new link to choose a new username and password.
              </p>
              {regenStudent.submission_count > 0 && (
                <p className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2
                               text-xs text-amber-800">
                  This student has {regenStudent.submission_count} submission{regenStudent.submission_count !== 1 ? "s" : ""}.
                  Their submissions and grades will be fully preserved.
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="flex-1 rounded-md bg-amber-600 py-2.5 text-sm font-semibold text-white
                             hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {regenerating ? "Regenerating…" : "Confirm & regenerate"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRegenModal(false)}
                  className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm text-slate-600
                             hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ── Submit-on-behalf modal ─────────────────────────────────────────── */}
      {showSubmitModal && soStudent && (
        <Modal
          title={`Submit for ${soStudent.display_name}`}
          onClose={() => setShowSubmitModal(false)}
        >
          <form onSubmit={handleSubmitOnBehalf} className="space-y-4">
            <p className="text-sm text-slate-600">
              You are submitting on behalf of{" "}
              <span className="font-semibold">{soStudent.display_name}</span>{" "}
              ({soStudent.student_code}). This action cannot be undone.
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Handwritten Exam PDF
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setHwFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded file:border-0
                           file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                WebAssign PDF
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setWaFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded file:border-0
                           file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium"
              />
            </div>

            {submitError && (
              <p className="text-sm text-red-600">{submitError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || !hwFile || !waFile}
                className="flex-1 rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white
                           hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting…" : "Submit & Grade"}
              </button>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm text-slate-600
                           hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative rounded-xl bg-white shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
