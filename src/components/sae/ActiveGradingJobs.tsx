"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type GradingJob,
  type NodeStatus,
  type ProviderNode,
  useGradingJobs,
} from "@/contexts/GradingJobsContext";

// ── Provider node card (moved from publisher/sae/page.tsx) ────────────────────

function ProviderNodeCard({ node }: { node: ProviderNode }) {
  const s = node.status;

  const ringColor =
    s.kind === "running"    ? "border-blue-400"
    : s.kind === "retrying" ? "border-orange-400"
    : s.kind === "success"  ? "border-green-400"
    : s.kind === "failed"   ? "border-red-400"
    : "border-slate-200";

  const bgColor =
    s.kind === "running"    ? "bg-blue-50"
    : s.kind === "retrying" ? "bg-orange-50"
    : s.kind === "success"  ? "bg-green-50"
    : s.kind === "failed"   ? "bg-red-50"
    : "bg-white";

  const dotColor =
    s.kind === "running"    ? "bg-blue-500"
    : s.kind === "retrying" ? "bg-orange-500"
    : s.kind === "success"  ? "bg-green-500"
    : s.kind === "failed"   ? "bg-red-500"
    : "bg-slate-300";

  const statusLabel =
    s.kind === "standby"    ? "standby"
    : s.kind === "running"  ? `attempt ${s.attempt}/${s.maxAttempts}`
    : s.kind === "retrying" ? `retry ${s.attempt}/${s.maxAttempts}`
    : s.kind === "success"  ? "✓ done"
    : "✗ failed";

  const statusColor =
    s.kind === "running"    ? "text-blue-600"
    : s.kind === "retrying" ? "text-orange-600"
    : s.kind === "success"  ? "text-green-600"
    : s.kind === "failed"   ? "text-red-600"
    : "text-slate-400";

  return (
    <div
      className={`relative flex flex-col items-center rounded-xl border-2 p-2 transition-all duration-300 ${ringColor} ${bgColor}`}
      style={{ minWidth: 76 }}
    >
      {(s.kind === "running" || s.kind === "retrying") && (
        <span
          className="absolute inset-0 rounded-xl animate-ping opacity-20"
          style={{ background: s.kind === "retrying" ? "#f97316" : "#3b82f6" }}
        />
      )}
      <span
        className={`h-2 w-2 rounded-full mb-1 ${dotColor} ${
          s.kind === "running" || s.kind === "retrying" ? "animate-pulse" : ""
        }`}
      />
      <span className="text-[10px] font-semibold text-slate-700 text-center leading-tight">
        {node.label}
      </span>
      <span className={`mt-0.5 text-[9px] font-medium ${statusColor}`}>
        {statusLabel}
      </span>
      {(s.kind === "retrying" || s.kind === "failed") && (
        <span className="mt-0.5 text-[8px] text-slate-500 text-center line-clamp-2 max-w-[68px]">
          {(s as Extract<NodeStatus, { kind: "retrying" | "failed" }>).reason
            ?.split(":")
            .slice(-1)[0]
            ?.trim()
            ?.slice(0, 40)}
        </span>
      )}
    </div>
  );
}

// ── Individual job card ───────────────────────────────────────────────────────

function JobCard({ job }: { job: GradingJob }) {
  const { confirmJob, dismissJob } = useGradingJobs();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const lastLog = job.log[job.log.length - 1];

  async function handleConfirm(continueGrading: boolean) {
    setConfirming(true);
    try {
      await confirmJob(job.requestId, continueGrading);
    } finally {
      setConfirming(false);
    }
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (job.phase === "done") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-green-800 truncate">
              ✓ {job.studentName}
            </p>
            <p className="text-[10px] font-mono text-green-700">{job.studentCode}</p>
            <p className="mt-0.5 text-[10px] text-green-700">Grading complete.</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => router.push(`/publisher/sae/students/${job.studentId}`)}
              className="rounded border border-green-300 bg-green-100 px-2 py-1 text-[10px] font-medium text-green-800 hover:bg-green-200 whitespace-nowrap transition-colors"
            >
              View results
            </button>
            <button
              onClick={() => dismissJob(job.requestId)}
              className="rounded border border-green-300 px-2 py-1 text-[10px] text-green-700 hover:bg-green-100 transition-colors"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (job.phase === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-red-800 truncate">
              ✗ {job.studentName}
            </p>
            <p className="text-[10px] font-mono text-red-700">{job.studentCode}</p>
            <p className="mt-0.5 text-[10px] text-red-700 line-clamp-2">
              {job.error ?? "Grading failed."}
            </p>
          </div>
          <button
            onClick={() => dismissJob(job.requestId)}
            className="shrink-0 rounded border border-red-300 px-2 py-1 text-[10px] text-red-700 hover:bg-red-100 transition-colors"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // ── Awaiting confirmation ─────────────────────────────────────────────────
  if (job.phase === "awaiting_confirm") {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
        <div>
          <p className="text-xs font-semibold text-amber-900">
            ⚠ {job.studentName}
          </p>
          <p className="text-[10px] font-mono text-amber-800">{job.studentCode}</p>
        </div>
        <p className="text-xs text-amber-900">
          Gemini Pro is currently unavailable or overloaded. We can continue
          grading using OpenAI instead.
        </p>
        <p className="text-xs font-medium text-amber-900">Would you like to continue?</p>
        <div className="flex gap-2">
          <button
            onClick={() => handleConfirm(true)}
            disabled={confirming}
            className="flex-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60 transition-colors"
          >
            {confirming ? "Please wait…" : "Continue with OpenAI"}
          </button>
          <button
            onClick={() => handleConfirm(false)}
            disabled={confirming}
            className="flex-1 rounded-md border border-amber-400 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100 disabled:opacity-60 transition-colors"
          >
            Cancel
          </button>
        </div>
        <p className="text-[10px] text-amber-700">
          No response within 3 minutes will automatically cancel this submission.
        </p>
      </div>
    );
  }

  // ── Grading (in progress) ─────────────────────────────────────────────────
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-800 truncate">{job.studentName}</p>
          <p className="text-[10px] font-mono text-slate-500">{job.studentCode}</p>
        </div>
      </div>

      {/* Mini provider chain */}
      <div className="flex items-center gap-1 flex-wrap">
        {job.nodes.map((node, i) => (
          <div key={node.label} className="flex items-center gap-1">
            <ProviderNodeCard node={node} />
            {i < job.nodes.length - 1 && (
              <span
                className={`text-xs font-light transition-colors ${
                  node.status.kind === "failed" ? "text-red-300" : "text-slate-300"
                }`}
              >
                →
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Last log line */}
      {lastLog && (
        <p
          className={`text-[10px] font-mono truncate ${
            lastLog.level === "error"    ? "text-red-600"
            : lastLog.level === "warn"  ? "text-orange-600"
            : lastLog.level === "success" ? "text-green-600"
            : "text-slate-500"
          }`}
        >
          {lastLog.ts} {lastLog.text}
        </p>
      )}
    </div>
  );
}

// ── Expanded job card (full detail, matches old modal style) ─────────────────

function ExpandedJobCard({ job }: { job: GradingJob }) {
  const { confirmJob, dismissJob } = useGradingJobs();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [job.log]);

  async function handleConfirm(continueGrading: boolean) {
    setConfirming(true);
    try { await confirmJob(job.requestId, continueGrading); }
    finally { setConfirming(false); }
  }

  const isGrading = job.phase === "grading";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
      {/* Student header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {isGrading && (
            <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          {job.phase === "done" && <span className="text-green-500 text-lg shrink-0">✓</span>}
          {job.phase === "error" && <span className="text-red-500 text-lg shrink-0">✗</span>}
          {job.phase === "awaiting_confirm" && <span className="text-amber-500 text-lg shrink-0">⚠</span>}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{job.studentName}</p>
            <p className="text-xs font-mono text-slate-500">{job.studentCode}</p>
          </div>
        </div>
        {(job.phase === "done" || job.phase === "error") && (
          <div className="flex gap-1.5 shrink-0">
            {job.phase === "done" && (
              <button
                onClick={() => router.push(`/publisher/sae/students/${job.studentId}`)}
                className="rounded border border-green-300 bg-green-50 px-3 py-1 text-xs font-medium text-green-800 hover:bg-green-100 transition-colors"
              >
                View results
              </button>
            )}
            <button
              onClick={() => dismissJob(job.requestId)}
              className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Provider chain */}
      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">Provider Chain</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {job.nodes.map((node, i) => (
            <div key={node.label} className="flex items-center gap-1.5">
              <ProviderNodeCard node={node} />
              {i < job.nodes.length - 1 && (
                <span className={`text-base font-light transition-colors ${
                  node.status.kind === "failed" ? "text-red-300" : "text-slate-300"
                }`}>→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Status message */}
      {isGrading && (
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block shrink-0" />
          Grading in progress — this may take ~30s…
        </p>
      )}

      {/* Error + retry */}
      {job.phase === "error" && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <strong>Grading failed.</strong> {job.error ?? "An unknown error occurred."}
        </div>
      )}

      {/* OpenAI confirmation prompt */}
      {job.phase === "awaiting_confirm" && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 space-y-3">
          <p className="text-sm text-amber-900">
            Gemini Pro is currently unavailable or overloaded. Continue grading using OpenAI instead?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleConfirm(true)}
              disabled={confirming}
              className="flex-1 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60 transition-colors"
            >
              {confirming ? "Please wait…" : "Continue with OpenAI"}
            </button>
            <button
              onClick={() => handleConfirm(false)}
              disabled={confirming}
              className="flex-1 rounded-md border border-amber-400 px-4 py-2 text-sm text-amber-800 hover:bg-amber-100 disabled:opacity-60 transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-amber-700">
            No response within 3 minutes will automatically cancel this submission.
          </p>
        </div>
      )}

      {/* Live log */}
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1.5">Live Log</p>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs space-y-1 max-h-56 overflow-y-auto">
          {job.log.length === 0 ? (
            <span className="text-slate-400">Waiting for events…</span>
          ) : (
            job.log.map((entry, i) => (
              <div key={i} className={`flex gap-3 leading-relaxed ${
                entry.level === "error"     ? "text-red-600"
                : entry.level === "warn"   ? "text-orange-500"
                : entry.level === "success" ? "text-green-600"
                : "text-slate-700"
              }`}>
                <span className="text-slate-400 shrink-0 tabular-nums">{entry.ts}</span>
                <span>{entry.text}</span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ActiveGradingJobs() {
  const { jobs } = useGradingJobs();
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (jobs.length === 0) return null;

  const activeCount = jobs.filter(
    (j) => j.phase === "grading" || j.phase === "awaiting_confirm",
  ).length;

  return (
    <>
      {/* Floating mini panel */}
      <div
        className="fixed bottom-24 right-4 z-30 w-[360px] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
        style={{ maxHeight: "60vh" }}
      >
        {/* Header */}
        <div className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            {activeCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            )}
            <span className="text-sm font-semibold text-slate-700">
              Grading Jobs
            </span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {jobs.length}
            </span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-1"
              title="Expand full view"
            >
              ⛶
            </button>
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              {collapsed ? "▲ show" : "▼ hide"}
            </button>
          </div>
        </div>

        {/* Job list */}
        {!collapsed && (
          <div className="p-3 space-y-2 overflow-y-auto" style={{ maxHeight: "calc(60vh - 49px)" }}>
            {jobs.map((job) => (
              <JobCard key={job.requestId} job={job} />
            ))}
          </div>
        )}
      </div>

      {/* Expanded panel — sits below the h-14 header, right of the w-64 sidebar */}
      {expanded && (
        <div className="fixed top-14 left-0 lg:left-64 right-0 bottom-0 z-20 flex flex-col bg-white border-l border-slate-200 shadow-2xl">
          {/* Panel header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
            <div className="flex items-center gap-3">
              {activeCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              )}
              <h2 className="text-base font-semibold text-slate-800">Grading Jobs</h2>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                {jobs.length}
              </span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              ✕ Close
            </button>
          </div>

          {/* Jobs grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {jobs.map((job) => (
                <ExpandedJobCard key={job.requestId} job={job} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
