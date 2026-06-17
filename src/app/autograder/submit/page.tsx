"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const API = "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

type ResolvedStudent = {
  student_id: string;
  student_code: string;
  display_name: string;
};

type NodeStatus =
  | { kind: "standby" }
  | { kind: "running"; attempt: number; maxAttempts: number }
  | { kind: "retrying"; attempt: number; maxAttempts: number; reason: string }
  | { kind: "failed"; attemptsMade: number; reason: string }
  | { kind: "success"; attempt: number };

type ProviderNode = {
  label: string;       // display name
  providerKey: string; // matches SSE event provider field suffix
  status: NodeStatus;
};

type LogEntry = {
  ts: string;
  text: string;
  level: "info" | "warn" | "error" | "success";
};

const INITIAL_NODES: ProviderNode[] = [
  { label: "Gemini Pro",   providerKey: "/pro",    status: { kind: "standby" } },
  { label: "Gemini Free",  providerKey: "/free",   status: { kind: "standby" } },
  { label: "Gemini Flash", providerKey: "/flash",  status: { kind: "standby" } },
  { label: "OpenAI",       providerKey: "openai/", status: { kind: "standby" } },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchNode(providerName: string | null | undefined, key: string): boolean {
  if (!providerName) return false;
  if (key === "openai/") return providerName.startsWith("openai/");
  return providerName.endsWith(key);
}

function nodeIndex(providerName: string | null | undefined, nodes: ProviderNode[]): number {
  return nodes.findIndex((n) => matchNode(providerName, n.providerKey));
}

function nowHHMMSS(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

// Parse raw SSE stream bytes into individual {eventType, data} pairs.
function* parseSSEChunks(buffer: string): Generator<{ eventType: string; data: string }> {
  const blocks = buffer.split(/\n\n/);
  for (const block of blocks) {
    if (!block.trim()) continue;
    let eventType = "message";
    let data = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) eventType = line.slice(6).trim();
      else if (line.startsWith("data:")) data = line.slice(5).trim();
    }
    if (data) yield { eventType, data };
  }
}

// ─── Node status card ─────────────────────────────────────────────────────────

function ProviderNodeCard({ node, isActive }: { node: ProviderNode; isActive: boolean }) {
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
    : s.kind === "success"  ? `✓ done`
    : `✗ failed`;

  const statusColor =
    s.kind === "running"   ? "text-blue-600"
    : s.kind === "retrying" ? "text-orange-600"
    : s.kind === "success"  ? "text-green-600"
    : s.kind === "failed"   ? "text-red-600"
    : "text-slate-400";

  return (
    <div
      className={`relative flex flex-col items-center rounded-xl border-2 p-4 transition-all duration-300 ${ringColor} ${bgColor} ${
        isActive ? "shadow-md" : ""
      }`}
      style={{ minWidth: 120 }}
    >
      {/* Pulsing ring for active states */}
      {(s.kind === "running" || s.kind === "retrying") && (
        <span className="absolute inset-0 rounded-xl animate-ping opacity-20"
          style={{ background: s.kind === "retrying" ? "#f97316" : "#3b82f6" }} />
      )}

      {/* Status dot */}
      <span className={`h-2.5 w-2.5 rounded-full mb-2 ${dotColor} ${
        s.kind === "running" || s.kind === "retrying" ? "animate-pulse" : ""
      }`} />

      {/* Provider name */}
      <span className="text-xs font-semibold text-slate-700 text-center leading-tight">
        {node.label}
      </span>

      {/* Status label */}
      <span className={`mt-1 text-xs font-medium ${statusColor}`}>
        {statusLabel}
      </span>

      {/* Reason snippet for retrying / failed */}
      {(s.kind === "retrying" || s.kind === "failed") && (
        <span className="mt-1 text-[10px] text-slate-500 text-center line-clamp-2 max-w-[110px]">
          {s.reason.split(":").slice(-1)[0].trim().slice(0, 60)}
        </span>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AutograderSubmitPage() {
  const router = useRouter();

  // Step 1 — student
  const [codeInput, setCodeInput] = useState("");
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "error">("idle");
  const [lookupError, setLookupError] = useState("");
  const [resolved, setResolved] = useState<ResolvedStudent | null>(null);

  // Inline new-student form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [createStatus, setCreateStatus] = useState<"idle" | "loading" | "error">("idle");
  const [createError, setCreateError] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  // Step 2 — files
  const [handwrittenFile, setHandwrittenFile] = useState<File | null>(null);
  const [webassignFile, setWebassignFile] = useState<File | null>(null);

  // Step 3 — grading state
  const [gradingPhase, setGradingPhase] = useState<
    "idle" | "connecting" | "grading" | "done" | "error"
  >("idle");
  const [submitError, setSubmitError] = useState("");
  const [nodes, setNodes] = useState<ProviderNode[]>(INITIAL_NODES);
  const [log, setLog] = useState<LogEntry[]>([]);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Scroll log to bottom whenever entries are added
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  function getToken() {
    return localStorage.getItem("auth_token") ?? "";
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
      case "provider_started":
        updateNode(provider!, () => ({
          kind: "running",
          attempt: ev.attempt as number,
          maxAttempts: 2,
        }));
        addLog(`${provider}: starting (attempt ${ev.attempt})…`, "info");
        break;

      case "provider_retry":
        updateNode(provider!, () => ({
          kind: "retrying",
          attempt: ev.attempt as number,
          maxAttempts: ev.max_attempts as number,
          reason: ev.reason as string,
        }));
        addLog(
          `${provider}: retrying (attempt ${ev.attempt}/${ev.max_attempts}) — ${(ev.reason as string)?.split(":").pop()?.trim()}`,
          "warn"
        );
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
        addLog(
          `Switching from ${ev.from} → ${ev.to}`,
          "warn"
        );
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

  async function handleSubmit() {
    if (!resolved || !handwrittenFile || !webassignFile) return;

    // Reset state
    setNodes(INITIAL_NODES.map((n) => ({ ...n, status: { kind: "standby" } })));
    setLog([]);
    setSubmitError("");
    setGradingPhase("connecting");

    const requestId = crypto.randomUUID();
    addLog(`Request ID: ${requestId}`, "info");
    addLog("Opening SSE connection…", "info");

    // ── Step A: open SSE stream BEFORE posting ──────────────────────────────
    let sseResponse: Response;
    try {
      sseResponse = await fetch(
        `${API}/api/autograder/grade/events/${requestId}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (!sseResponse.ok || !sseResponse.body) {
        throw new Error(`SSE open failed: HTTP ${sseResponse.status}`);
      }
    } catch (err) {
      addLog(`SSE connection failed: ${err}. Submitting without live updates.`, "warn");
      // Degrade gracefully — fall through to plain POST
      await submitWithoutSSE(requestId);
      return;
    }

    addLog("SSE connected. Sending files to grader…", "info");
    setGradingPhase("grading");

    // Start consuming the SSE stream in background
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
        // reader was cancelled (normal on cleanup)
      }
    })();

    // ── Step B: POST the form ───────────────────────────────────────────────
    const formData = new FormData();
    formData.append("student_id", resolved.student_id);
    formData.append("request_id", requestId);
    formData.append("student_answer", handwrittenFile);
    formData.append("webassign_pdf", webassignFile);

    try {
      const resp = await fetch(`${API}/api/autograder/grade`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });

      await sseLoop; // drain remaining SSE events

      if (!resp.ok) {
        const detail = await resp.text();
        throw new Error(detail);
      }

      const data = await resp.json();
      setGradingPhase("done");
      router.push(`/autograder/result/${data.submission_id}`);
    } catch (err) {
      await sseLoop;
      if (gradingPhase !== "error") {
        setGradingPhase("error");
        setSubmitError(err instanceof Error ? err.message : "Grading failed.");
        addLog(`Request failed: ${err}`, "error");
      }
    } finally {
      reader.cancel().catch(() => {});
      readerRef.current = null;
    }
  }

  // Fallback plain-POST path if SSE connection itself fails
  async function submitWithoutSSE(requestId: string) {
    setGradingPhase("grading");
    const formData = new FormData();
    formData.append("student_id", resolved!.student_id);
    formData.append("request_id", requestId);
    formData.append("student_answer", handwrittenFile!);
    formData.append("webassign_pdf", webassignFile!);
    try {
      const resp = await fetch(`${API}/api/autograder/grade`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setGradingPhase("done");
      router.push(`/autograder/result/${data.submission_id}`);
    } catch (err) {
      setGradingPhase("error");
      setSubmitError(err instanceof Error ? err.message : "Grading failed.");
    }
  }

  // ── Student lookup ─────────────────────────────────────────────────────────

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
      setResolved({ student_id: data.student_id, student_code: data.student_code, display_name: data.display_name });
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ display_name: name }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setCreatedCode(data.student_code);
      setResolved({ student_id: data.student_id, student_code: data.student_code, display_name: data.display_name });
      setShowNewForm(false);
      setNewDisplayName("");
      setCreateStatus("idle");
    } catch (err) {
      setCreateStatus("error");
      setCreateError(err instanceof Error ? err.message : "Create failed.");
    }
  }

  function handleReset() {
    readerRef.current?.cancel().catch(() => {});
    readerRef.current = null;
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
    setGradingPhase("idle");
    setSubmitError("");
    setNodes(INITIAL_NODES.map((n) => ({ ...n, status: { kind: "standby" } })));
    setLog([]);
  }

  const isGrading = gradingPhase === "connecting" || gradingPhase === "grading";
  const showChain = gradingPhase !== "idle";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-600">Math Placement Test</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Grade Submission</h1>
          <p className="mt-2 text-slate-600">
            Look up a student by code, then upload their work for AI grading.
          </p>
        </div>

        {/* ── Step 1: Student ── */}
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
              {!showNewForm && (
                <button onClick={() => setShowNewForm(true)} className="text-sm text-blue-600 hover:underline">
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
                  {createStatus === "error" && <p className="text-sm text-red-600">{createError}</p>}
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
                <button onClick={handleReset} className="text-xs text-slate-500 underline hover:text-slate-700">
                  Change
                </button>
              </div>
              {createdCode && (
                <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-sm text-blue-800">
                    New student code: <span className="font-mono font-bold">{createdCode}</span>
                  </p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(createdCode); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }}
                    className="ml-4 rounded border border-blue-300 bg-blue-100 px-2 py-1 text-xs text-blue-800 hover:bg-blue-200"
                  >
                    {codeCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Step 2: Files ── */}
        {resolved && (
          <div className="mt-4 rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Step 2 — Upload Work
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Handwritten Solution (PDF) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file" accept=".pdf" disabled={isGrading}
                  onChange={(e) => setHandwrittenFile(e.target.files?.[0] ?? null)}
                  className="mt-2 block w-full rounded-md border border-slate-300 p-2 text-sm disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  WebAssign Questions (PDF) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file" accept=".pdf" disabled={isGrading}
                  onChange={(e) => setWebassignFile(e.target.files?.[0] ?? null)}
                  className="mt-2 block w-full rounded-md border border-slate-300 p-2 text-sm disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Grade + Provider Chain ── */}
        {resolved && (
          <div className="mt-4 rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Step 3 — Grade
            </h2>

            {/* Provider chain — always visible once grading starts */}
            {showChain && (
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-500 mb-3">Provider Chain</p>
                <div className="flex items-center gap-2">
                  {nodes.map((node, i) => (
                    <div key={node.label} className="flex items-center gap-2">
                      <ProviderNodeCard
                        node={node}
                        isActive={node.status.kind === "running" || node.status.kind === "retrying"}
                      />
                      {i < nodes.length - 1 && (
                        <span className={`text-lg font-light transition-colors ${
                          node.status.kind === "failed" ? "text-red-300" : "text-slate-300"
                        }`}>→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit button */}
            {gradingPhase === "error" && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <strong>Grading failed.</strong> {submitError}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleSubmit}
                    className="rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Retry
                  </button>
                  <a
                    href="mailto:support@profsidekick.com"
                    className="rounded-md border border-red-300 px-4 py-1.5 text-xs text-red-700 hover:bg-red-100"
                  >
                    Contact Support
                  </a>
                </div>
              </div>
            )}

            {gradingPhase !== "error" && (
              <button
                onClick={handleSubmit}
                disabled={isGrading || !handwrittenFile || !webassignFile}
                className="mt-4 rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {gradingPhase === "connecting"
                  ? "Connecting…"
                  : gradingPhase === "grading"
                  ? "Grading… (this may take ~30s)"
                  : "Submit for Grading"}
              </button>
            )}

            {isGrading && (
              <p className="mt-2 text-xs text-slate-500">
                You will be redirected to the report automatically when grading completes.
              </p>
            )}

            {/* Live log */}
            {log.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-medium text-slate-500 mb-2">Live Log</p>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 font-mono text-xs space-y-0.5 max-h-40 overflow-y-auto">
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

        <div className="mt-6">
          <a href="/autograder" className="text-sm text-slate-500 hover:underline">
            ← Back to Autograder
          </a>
        </div>
      </div>
    </main>
  );
}
