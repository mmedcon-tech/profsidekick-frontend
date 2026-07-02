"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createAssessment,
  createStudentBatch,
  listAssessments,
  listStudents,
  regenerateStudentAccess,
} from "@/lib/sae-api";
import type { SAEAssessmentRow, SAEStudentRow } from "@/types/sae";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

type Toast = { id: number; text: string; kind: "success" | "error" };

type NodeStatus =
  | { kind: "standby" }
  | { kind: "running"; attempt: number; maxAttempts: number }
  | { kind: "retrying"; attempt: number; maxAttempts: number; reason: string }
  | { kind: "failed"; attemptsMade: number; reason: string }
  | { kind: "success"; attempt: number };

type ProviderNode = {
  label: string;
  providerKey: string;
  status: NodeStatus;
};

type LogEntry = {
  ts: string;
  text: string;
  level: "info" | "warn" | "error" | "success";
};

type GradingPhase = "idle" | "connecting" | "grading" | "done" | "error";

// Order matches the backend fallback chain
const INITIAL_NODES: ProviderNode[] = [
  { label: "Vertex AI",    providerKey: "vertex/", status: { kind: "standby" } },
  { label: "Gemini Pro",   providerKey: "/pro",    status: { kind: "standby" } },
  { label: "OpenAI",       providerKey: "openai/", status: { kind: "standby" } },
  { label: "Gemini Flash", providerKey: "/flash",  status: { kind: "standby" } },
  { label: "Gemini Free",  providerKey: "/free",   status: { kind: "standby" } },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function matchNode(providerName: string | null | undefined, key: string): boolean {
  if (!providerName) return false;
  if (key.endsWith("/")) return providerName.startsWith(key);
  return providerName.endsWith(key);
}

function nodeIndex(providerName: string | null | undefined, nodes: ProviderNode[]): number {
  return nodes.findIndex((n) => matchNode(providerName, n.providerKey));
}

function nowHHMMSS(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function getToken(): string {
  return typeof window !== "undefined" ? (localStorage.getItem("auth_token") ?? "") : "";
}

function authHeaders(): HeadersInit {
  const token = getToken();
  const instance = process.env.NEXT_PUBLIC_FRONTEND_INSTANCE ?? "main";
  return {
    "X-Frontend-Instance": instance,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function StatusBadge({ on, labelOn, labelOff }: { on: boolean; labelOn: string; labelOff: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
      ${on ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}`}>
      {on ? labelOn : labelOff}
    </span>
  );
}

// ── Provider node card (SSE visual feedback) ──────────────────────────────────

function ProviderNodeCard({ node }: { node: ProviderNode }) {
  const s = node.status;

  const ringColor =
    s.kind === "running"   ? "border-blue-400"
    : s.kind === "retrying" ? "border-orange-400"
    : s.kind === "success"  ? "border-green-400"
    : s.kind === "failed"   ? "border-red-400"
    : "border-slate-200";

  const bgColor =
    s.kind === "running"   ? "bg-blue-50"
    : s.kind === "retrying" ? "bg-orange-50"
    : s.kind === "success"  ? "bg-green-50"
    : s.kind === "failed"   ? "bg-red-50"
    : "bg-white";

  const dotColor =
    s.kind === "running"   ? "bg-blue-500"
    : s.kind === "retrying" ? "bg-orange-500"
    : s.kind === "success"  ? "bg-green-500"
    : s.kind === "failed"   ? "bg-red-500"
    : "bg-slate-300";

  const statusLabel =
    s.kind === "standby"   ? "standby"
    : s.kind === "running"  ? `attempt ${s.attempt}/${s.maxAttempts}`
    : s.kind === "retrying" ? `retry ${s.attempt}/${s.maxAttempts}`
    : s.kind === "success"  ? "✓ done"
    : "✗ failed";

  const statusColor =
    s.kind === "running"   ? "text-blue-600"
    : s.kind === "retrying" ? "text-orange-600"
    : s.kind === "success"  ? "text-green-600"
    : s.kind === "failed"   ? "text-red-600"
    : "text-slate-400";

  return (
    <div className={`relative flex flex-col items-center rounded-xl border-2 p-3 transition-all duration-300 ${ringColor} ${bgColor}`}
      style={{ minWidth: 100 }}>
      {(s.kind === "running" || s.kind === "retrying") && (
        <span className="absolute inset-0 rounded-xl animate-ping opacity-20"
          style={{ background: s.kind === "retrying" ? "#f97316" : "#3b82f6" }} />
      )}
      <span className={`h-2 w-2 rounded-full mb-1.5 ${dotColor} ${
        s.kind === "running" || s.kind === "retrying" ? "animate-pulse" : ""
      }`} />
      <span className="text-xs font-semibold text-slate-700 text-center leading-tight">{node.label}</span>
      <span className={`mt-0.5 text-[10px] font-medium ${statusColor}`}>{statusLabel}</span>
      {(s.kind === "retrying" || s.kind === "failed") && (
        <span className="mt-0.5 text-[9px] text-slate-500 text-center line-clamp-2 max-w-[90px]">
          {s.reason.split(":").slice(-1)[0].trim().slice(0, 50)}
        </span>
      )}
    </div>
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

  // Submit-on-behalf modal + SSE state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [soStudent, setSoStudent] = useState<SAEStudentRow | null>(null);
  const [hwFile, setHwFile] = useState<File | null>(null);
  const [waFile, setWaFile] = useState<File | null>(null);
  const [gradingPhase, setGradingPhase] = useState<GradingPhase>("idle");
  const [submitError, setSubmitError] = useState("");
  const [nodes, setNodes] = useState<ProviderNode[]>(INITIAL_NODES);
  const [log, setLog] = useState<LogEntry[]>([]);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Regenerate-access modal
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenStudent, setRegenStudent] = useState<SAEStudentRow | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenUrl, setRegenUrl] = useState<string | null>(null);

  // Assessment management
  const [assessments, setAssessments] = useState<SAEAssessmentRow[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [showNewAssessment, setShowNewAssessment] = useState(false);
  const [newAssessmentName, setNewAssessmentName] = useState("");
  const [newAssessmentDesc, setNewAssessmentDesc] = useState("");
  const [creatingAssessment, setCreatingAssessment] = useState(false);

  // Scroll log to bottom on new entries
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  function toast(text: string, kind: "success" | "error" = "success") {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, text, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  function addLog(text: string, level: LogEntry["level"] = "info") {
    setLog((prev) => [...prev, { ts: nowHHMMSS(), text, level }]);
  }

  function updateNode(providerName: string, updater: (prev: NodeStatus) => NodeStatus) {
    setNodes((prev) =>
      prev.map((n, i) =>
        i === nodeIndex(providerName, prev) ? { ...n, status: updater(n.status) } : n
      )
    );
  }

  function handleSSEEvent(eventType: string, rawData: string) {
    if (eventType === "heartbeat") return;
    let ev: Record<string, unknown> = {};
    try { ev = JSON.parse(rawData); } catch { return; }
    const provider = ev.provider as string | undefined;

    switch (eventType) {
      case "files_ready":
        addLog("Files received — starting grading pipeline.", "success");
        break;
      case "provider_started":
        updateNode(provider!, () => ({
          kind: "running",
          attempt: ev.attempt as number,
          maxAttempts: (ev.max_attempts as number) ?? 1,
        }));
        addLog(`${provider}: starting (attempt ${ev.attempt}/${(ev.max_attempts as number) ?? 1})…`, "info");
        break;
      case "provider_retry":
        updateNode(provider!, () => ({
          kind: "retrying",
          attempt: ev.attempt as number,
          maxAttempts: ev.max_attempts as number,
          reason: ev.reason as string,
        }));
        addLog(`${provider}: retrying (${ev.attempt}/${ev.max_attempts}) — ${(ev.reason as string)?.split(":").pop()?.trim()}`, "warn");
        break;
      case "provider_failed":
        updateNode(provider!, () => ({
          kind: "failed",
          attemptsMade: ev.attempts_made as number,
          reason: ev.reason as string,
        }));
        addLog(`${provider}: failed after ${ev.attempts_made} attempt(s).`, "error");
        break;
      case "fallback_switch":
        addLog(`Switching from ${ev.from} → ${ev.to}`, "warn");
        break;
      case "provider_success":
        updateNode(provider!, (prev) => ({
          kind: "success",
          attempt: prev.kind === "running" || prev.kind === "retrying" ? prev.attempt : 1,
        }));
        addLog(`${provider}: succeeded.`, "success");
        break;
      case "grading_complete":
        addLog("Grading complete — saving result…", "success");
        break;
      case "grading_failed":
        addLog(`All providers failed: ${ev.reason}`, "error");
        setGradingPhase("error");
        setSubmitError(String(ev.reason ?? "All grading providers exhausted."));
        break;
    }
  }

  // ── Submit with SSE streaming ─────────────────────────────────────────────

  async function handleSubmitOnBehalf(e: React.FormEvent) {
    e.preventDefault();
    if (!soStudent || !hwFile || !waFile) return;

    setNodes(INITIAL_NODES.map((n) => ({ ...n, status: { kind: "standby" } })));
    setLog([]);
    setSubmitError("");
    setGradingPhase("connecting");

    const requestId = crypto.randomUUID();
    addLog(`Request ID: ${requestId}`, "info");
    addLog("Opening SSE connection…", "info");

    // Step A: open SSE stream BEFORE posting files
    let sseResponse: Response | null = null;
    try {
      sseResponse = await fetch(
        `${API}/api/sae/publisher/students/${soStudent.id}/grade/events/${requestId}`,
        { headers: authHeaders() }
      );
      if (!sseResponse.ok || !sseResponse.body) {
        throw new Error(`SSE open failed: HTTP ${sseResponse.status}`);
      }
    } catch (err) {
      addLog(`SSE unavailable: ${err}. Submitting without live updates.`, "warn");
      await submitWithoutSSE(requestId);
      return;
    }

    addLog("SSE connected. Sending files to grader…", "info");
    setGradingPhase("grading");

    // Drain SSE stream in background
    const reader = sseResponse.body.getReader();
    readerRef.current = reader;
    const decoder = new TextDecoder();
    let buffer = "";

    const sseLoop = (async () => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split(/\n\n/);
          buffer = parts.pop() ?? "";
          for (const block of parts) {
            if (!block.trim()) continue;
            let eventType = "message";
            let data = "";
            for (const line of block.split("\n")) {
              if (line.startsWith("event:")) eventType = line.slice(6).trim();
              else if (line.startsWith("data:")) data = line.slice(5).trim();
            }
            if (data) handleSSEEvent(eventType, data);
          }
        }
      } catch {
        // reader was cancelled — normal on cleanup
      }
    })();

    // Step B: POST the files with request_id
    const formData = new FormData();
    formData.append("student_answer", hwFile);
    formData.append("webassign_pdf", waFile);
    formData.append("request_id", requestId);

    try {
      const resp = await fetch(
        `${API}/api/sae/publisher/students/${soStudent.id}/submit`,
        { method: "POST", headers: authHeaders(), body: formData }
      );

      await sseLoop;

      if (!resp.ok) throw new Error(await resp.text());

      setGradingPhase("done");
      toast(`Submission for ${soStudent.display_name} graded successfully.`);
      setShowSubmitModal(false);
      resetSubmitModal();
      loadStudents(search || undefined);
    } catch (err) {
      await sseLoop;
      if (gradingPhase !== "error") {
        setGradingPhase("error");
        const msg = err instanceof Error ? err.message : "Submission failed.";
        setSubmitError(msg);
        addLog(`Request failed: ${msg}`, "error");
      }
    } finally {
      reader.cancel().catch(() => {});
      readerRef.current = null;
    }
  }

  // Fallback: plain POST when SSE connection itself fails
  async function submitWithoutSSE(requestId: string) {
    setGradingPhase("grading");
    const formData = new FormData();
    formData.append("student_answer", hwFile!);
    formData.append("webassign_pdf", waFile!);
    formData.append("request_id", requestId);
    try {
      const resp = await fetch(
        `${API}/api/sae/publisher/students/${soStudent!.id}/submit`,
        { method: "POST", headers: authHeaders(), body: formData }
      );
      if (!resp.ok) throw new Error(await resp.text());
      setGradingPhase("done");
      toast(`Submission for ${soStudent!.display_name} saved.`);
      setShowSubmitModal(false);
      resetSubmitModal();
      loadStudents(search || undefined);
    } catch (err) {
      setGradingPhase("error");
      setSubmitError(err instanceof Error ? err.message : "Submission failed.");
    }
  }

  function resetSubmitModal() {
    readerRef.current?.cancel().catch(() => {});
    readerRef.current = null;
    setSoStudent(null);
    setHwFile(null);
    setWaFile(null);
    setGradingPhase("idle");
    setSubmitError("");
    setNodes(INITIAL_NODES.map((n) => ({ ...n, status: { kind: "standby" } })));
    setLog([]);
  }

  function openSubmitModal(student: SAEStudentRow) {
    resetSubmitModal();
    setSoStudent(student);
    setShowSubmitModal(true);
  }

  function closeSubmitModal() {
    if (gradingPhase === "grading" || gradingPhase === "connecting") return; // block close mid-grading
    setShowSubmitModal(false);
    resetSubmitModal();
  }

  // ── Assessments & student list ────────────────────────────────────────────

  useEffect(() => { loadAssessments(); loadStudents(); }, []);

  async function loadAssessments() {
    try {
      const data = await listAssessments();
      setAssessments(data);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to load assessments.", "error");
    }
  }

  async function loadStudents(q?: string) {
    setLoading(true);
    try {
      const data = await listStudents(q, selectedAssessmentId ?? undefined);
      setStudents(data);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to load students.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => loadStudents(search || undefined), 350);
    return () => clearTimeout(t);
  }, [search, selectedAssessmentId]);

  // ── Generate batch ─────────────────────────────────────────────────────────

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAssessmentId || !genCount || Number(genCount) < 1) return;
    setGenerating(true);
    try {
      const res = await createStudentBatch(selectedAssessmentId, Number(genCount), genDays ? Number(genDays) : undefined);
      setNewBatch(res.students);
      loadStudents(search || undefined);
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

  async function handleCreateAssessment(e: React.FormEvent) {
    e.preventDefault();
    if (!newAssessmentName.trim()) return;
    setCreatingAssessment(true);
    try {
      const a = await createAssessment(newAssessmentName.trim(), newAssessmentDesc.trim() || undefined);
      setAssessments((prev) => [a, ...prev]);
      setSelectedAssessmentId(a.id);
      setShowNewAssessment(false);
      setNewAssessmentName("");
      setNewAssessmentDesc("");
      toast(`Assessment "${a.name}" created.`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to create assessment.", "error");
    } finally {
      setCreatingAssessment(false);
    }
  }

  // ── Regenerate access ──────────────────────────────────────────────────────

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

  const isGrading = gradingPhase === "connecting" || gradingPhase === "grading";
  const showChain = gradingPhase !== "idle";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-50">

      {/* Toast stack */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id}
            className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg
              ${t.kind === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
            {t.text}
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* Page header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-blue-600">Publisher Dashboard</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Self Assessment Exam</h1>
            <p className="mt-1 text-sm text-slate-500">Manage pre-generated student slots and their submissions.</p>
          </div>
          <button
            onClick={() => setShowGenerate(true)}
            disabled={!selectedAssessmentId}
            title={!selectedAssessmentId ? "Select or create an assessment first" : undefined}
            className="shrink-0 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              <button onClick={() => setNewBatch(null)} className="text-xs text-blue-600 hover:underline">Dismiss</button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {newBatch.map((s) => (
                <div key={s.id}
                  className="flex items-center justify-between rounded-lg bg-white border border-blue-100 px-3 py-2 gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-mono font-semibold text-slate-700">{s.student_code}</span>
                    <span className="ml-2 text-xs text-slate-500 truncate max-w-xs inline-block align-bottom">{s.invitation_url}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(s.invitation_url, s.student_code)}
                    className="shrink-0 rounded border border-blue-300 bg-blue-100 px-2 py-1 text-xs text-blue-800 hover:bg-blue-200 whitespace-nowrap"
                  >
                    Copy link
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assessment selector */}
        <div className="mb-4 flex items-center gap-3">
          <select
            value={selectedAssessmentId ?? ""}
            onChange={(e) => setSelectedAssessmentId(e.target.value || null)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white min-w-[220px]"
          >
            <option value="">All assessments ({assessments.length})</option>
            {assessments.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowNewAssessment(true)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 whitespace-nowrap transition-colors"
          >
            + New Assessment
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student code or name…"
            className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-400">Loading…</div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <p className="text-sm">No students yet.</p>
              <button onClick={() => setShowGenerate(true)} className="mt-3 text-sm text-blue-600 hover:underline">
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
                          <button onClick={() => copyToClipboard(s.invitation_url, s.student_code)}
                            className="rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100">
                            Copy link
                          </button>
                        )}
                        {s.is_activated && (
                          <button onClick={() => openRegenModal(s)}
                            className="rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-100">
                            Regenerate link
                          </button>
                        )}
                        {s.submission_count > 0 && (
                          <button onClick={() => router.push(`/publisher/sae/students/${s.id}`)}
                            className="rounded border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-100">
                            Review
                          </button>
                        )}
                        {s.submission_count < 5 && (
                          <button onClick={() => openSubmitModal(s)}
                            className="rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100">
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
            {selectedAssessmentId && (
              <p className="text-sm text-slate-500">
                Adding to: <span className="font-medium text-slate-700">
                  {assessments.find((a) => a.id === selectedAssessmentId)?.name}
                </span>
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Number of students to generate</label>
              <input type="number" min={1} max={500} value={genCount}
                onChange={(e) => setGenCount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 20"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-slate-400">New slots are added to the existing pool — existing students are not affected.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Link expiry (days) — optional</label>
              <input type="number" min={1} max={365} value={genDays}
                onChange={(e) => setGenDays(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Leave blank for no expiry"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={generating || !genCount}
                className="flex-1 rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed">
                {generating ? "Generating…" : "Generate"}
              </button>
              <button type="button" onClick={() => setShowGenerate(false)}
                className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Regenerate access modal ───────────────────────────────────────── */}
      {showRegenModal && regenStudent && (
        <Modal title="Regenerate Access Link" onClose={() => { setShowRegenModal(false); setRegenUrl(null); }}>
          {regenUrl ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                A new link has been generated for <span className="font-semibold">{regenStudent.display_name}</span>.
                The student&apos;s previous login is now invalid.
              </p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 break-all text-xs font-mono text-slate-700">
                {regenUrl}
              </div>
              <button onClick={() => copyToClipboard(regenUrl, regenStudent.student_code)}
                className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                Copy link
              </button>
              <button onClick={() => { setShowRegenModal(false); setRegenUrl(null); }}
                className="w-full rounded-md border border-slate-300 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                This will reset <span className="font-semibold">{regenStudent.display_name}</span>&apos;s
                login credentials. They will not be able to sign in until they use the new link.
              </p>
              {regenStudent.submission_count > 0 && (
                <p className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  This student has {regenStudent.submission_count} submission{regenStudent.submission_count !== 1 ? "s" : ""}.
                  Their submissions and grades will be fully preserved.
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={handleRegenerate} disabled={regenerating}
                  className="flex-1 rounded-md bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed">
                  {regenerating ? "Regenerating…" : "Confirm & regenerate"}
                </button>
                <button type="button" onClick={() => setShowRegenModal(false)}
                  className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ── Submit-on-behalf modal (publisher only, with SSE progress) ─────── */}
      {showSubmitModal && soStudent && (
        <Modal
          title={`Submit for ${soStudent.display_name}`}
          onClose={closeSubmitModal}
          wide
        >
          <form onSubmit={handleSubmitOnBehalf} className="space-y-4">
            {gradingPhase === "idle" && (
              <>
                <p className="text-sm text-slate-600">
                  You are submitting on behalf of{" "}
                  <span className="font-semibold">{soStudent.display_name}</span>{" "}
                  ({soStudent.student_code}). This action cannot be undone.
                </p>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Handwritten Exam PDF</label>
                  <input type="file" accept=".pdf" onChange={(e) => setHwFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">WebAssign PDF</label>
                  <input type="file" accept=".pdf" onChange={(e) => setWaFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={!hwFile || !waFile}
                    className="flex-1 rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed">
                    Submit &amp; Grade
                  </button>
                  <button type="button" onClick={closeSubmitModal}
                    className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              </>
            )}

            {/* ── SSE progress view (shown once grading starts) ── */}
            {gradingPhase !== "idle" && (
              <div className="space-y-4">
                {/* Provider chain */}
                {showChain && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">Provider Chain</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {nodes.map((node, i) => (
                        <div key={node.label} className="flex items-center gap-1.5">
                          <ProviderNodeCard node={node} />
                          {i < nodes.length - 1 && (
                            <span className={`text-base font-light transition-colors ${
                              node.status.kind === "failed" ? "text-red-300" : "text-slate-300"
                            }`}>→</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status message */}
                {isGrading && (
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
                    {gradingPhase === "connecting" ? "Connecting to grading service…" : "Grading in progress — this may take ~30s…"}
                  </p>
                )}

                {gradingPhase === "error" && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <strong>Grading failed.</strong> {submitError}
                    <div className="mt-2 flex gap-2">
                      <button type="submit" disabled={!hwFile || !waFile}
                        className="rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                        Retry
                      </button>
                      <button type="button" onClick={closeSubmitModal}
                        className="rounded-md border border-red-300 px-4 py-1.5 text-xs text-red-700 hover:bg-red-100">
                        Close
                      </button>
                    </div>
                  </div>
                )}

                {/* Live log */}
                {log.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Live Log</p>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 font-mono text-xs space-y-0.5 max-h-36 overflow-y-auto">
                      {log.map((entry, i) => (
                        <div key={i} className={`flex gap-2 ${
                          entry.level === "error"   ? "text-red-600"
                          : entry.level === "warn"  ? "text-orange-600"
                          : entry.level === "success" ? "text-green-600"
                          : "text-slate-600"
                        }`}>
                          <span className="text-slate-400 shrink-0">{entry.ts}</span>
                          <span>{entry.text}</span>
                        </div>
                      ))}
                      <div ref={logEndRef} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>
        </Modal>
      )}
      {/* ── New Assessment modal ─────────────────────────────────────────── */}
      {showNewAssessment && (
        <Modal
          title="New Assessment"
          onClose={() => { setShowNewAssessment(false); setNewAssessmentName(""); setNewAssessmentDesc(""); }}
        >
          <form onSubmit={handleCreateAssessment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assessment name</label>
              <input
                type="text"
                value={newAssessmentName}
                onChange={(e) => setNewAssessmentName(e.target.value)}
                placeholder="e.g. Fall 2025 Placement Test"
                autoFocus
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
              <textarea
                value={newAssessmentDesc}
                onChange={(e) => setNewAssessmentDesc(e.target.value)}
                placeholder="Optional notes about this assessment…"
                rows={2}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={creatingAssessment || !newAssessmentName.trim()}
                className="flex-1 rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creatingAssessment ? "Creating…" : "Create Assessment"}
              </button>
              <button
                type="button"
                onClick={() => { setShowNewAssessment(false); setNewAssessmentName(""); setNewAssessmentDesc(""); }}
                className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
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
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`relative rounded-xl bg-white shadow-xl w-full ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
