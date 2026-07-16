"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { authHeaders } from "@/lib/sae-api";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

export type NodeStatus =
  | { kind: "standby" }
  | { kind: "running"; attempt: number; maxAttempts: number }
  | { kind: "retrying"; attempt: number; maxAttempts: number; reason: string }
  | { kind: "failed"; attemptsMade: number; reason: string }
  | { kind: "success"; attempt: number };

export type ProviderNode = {
  label: string;
  providerKey: string;
  status: NodeStatus;
};

export type LogEntry = {
  ts: string;
  text: string;
  level: "info" | "warn" | "error" | "success";
};

export type GradingPhase = "grading" | "awaiting_confirm" | "done" | "error";

export type GradingJob = {
  requestId: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  phase: GradingPhase;
  nodes: ProviderNode[];
  log: LogEntry[];
  error?: string;
};

export type TrackJobParams = {
  requestId: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  reader: ReadableStreamDefaultReader<Uint8Array> | null;
  fetchPromise: Promise<Response>;
};

type GradingJobsContextValue = {
  jobs: GradingJob[];
  trackJob: (params: TrackJobParams) => void;
  confirmJob: (requestId: string, continueGrading: boolean) => Promise<void>;
  dismissJob: (requestId: string) => void;
};

// ── Constants (exported so ActiveGradingJobs can reference provider keys) ─────

export const PROVIDER_NODES: Omit<ProviderNode, "status">[] = [
  { label: "Vertex AI",    providerKey: "vertex/" },
  { label: "Gemini Pro",   providerKey: "/pro" },
  { label: "OpenAI",       providerKey: "openai/" },
  { label: "Gemini Flash", providerKey: "/flash" },
  { label: "Gemini Free",  providerKey: "/free" },
];

// ── Module-level helpers ──────────────────────────────────────────────────────

function matchNode(providerName: string | null | undefined, key: string): boolean {
  if (!providerName) return false;
  if (key.endsWith("/")) return providerName.startsWith(key);
  return providerName.endsWith(key);
}

function updateNodeStatus(
  nodes: ProviderNode[],
  providerName: string,
  updater: (prev: NodeStatus) => NodeStatus,
): ProviderNode[] {
  const idx = nodes.findIndex((n) => matchNode(providerName, n.providerKey));
  if (idx === -1) return nodes;
  return nodes.map((n, i) =>
    i === idx ? { ...n, status: updater(n.status) } : n,
  );
}

function nowHHMMSS(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function freshNodes(): ProviderNode[] {
  return PROVIDER_NODES.map((n) => ({ ...n, status: { kind: "standby" } as NodeStatus }));
}

// ── SSE processing (module-level: receives setJobs to avoid stale closures) ──

type SetJobs = React.Dispatch<React.SetStateAction<GradingJob[]>>;

function applySSEEvent(
  setJobs: SetJobs,
  requestId: string,
  eventType: string,
  rawData: string,
): void {
  if (eventType === "heartbeat") return;

  let ev: Record<string, unknown> = {};
  try {
    ev = JSON.parse(rawData);
  } catch {
    return;
  }

  const ts = nowHHMMSS();
  const provider = ev.provider as string | undefined;

  setJobs((prev) =>
    prev.map((job) => {
      if (job.requestId !== requestId) return job;

      const addLog = (text: string, level: LogEntry["level"]): LogEntry[] => [
        ...job.log,
        { ts, text, level },
      ];

      switch (eventType) {
        case "files_ready":
          return { ...job, log: addLog("Files received — starting grading pipeline.", "success") };

        case "provider_started":
          return {
            ...job,
            nodes: updateNodeStatus(job.nodes, provider!, () => ({
              kind: "running",
              attempt: ev.attempt as number,
              maxAttempts: (ev.max_attempts as number) ?? 1,
            })),
            log: addLog(
              `${provider}: starting (attempt ${ev.attempt}/${(ev.max_attempts as number) ?? 1})…`,
              "info",
            ),
          };

        case "provider_retry":
          return {
            ...job,
            nodes: updateNodeStatus(job.nodes, provider!, () => ({
              kind: "retrying",
              attempt: ev.attempt as number,
              maxAttempts: ev.max_attempts as number,
              reason: ev.reason as string,
            })),
            log: addLog(
              `${provider}: retrying (${ev.attempt}/${ev.max_attempts}) — ${(ev.reason as string)?.split(":").pop()?.trim()}`,
              "warn",
            ),
          };

        case "provider_failed":
          return {
            ...job,
            nodes: updateNodeStatus(job.nodes, provider!, () => ({
              kind: "failed",
              attemptsMade: ev.attempts_made as number,
              reason: ev.reason as string,
            })),
            log: addLog(`${provider}: failed after ${ev.attempts_made} attempt(s).`, "error"),
          };

        case "fallback_switch":
          return {
            ...job,
            log: addLog(`Switching from ${ev.from} → ${ev.to}`, "warn"),
          };

        case "provider_success":
          return {
            ...job,
            nodes: updateNodeStatus(job.nodes, provider!, (prev) => ({
              kind: "success",
              attempt: prev.kind === "running" || prev.kind === "retrying" ? prev.attempt : 1,
            })),
            log: addLog(`${provider}: succeeded.`, "success"),
          };

        case "grading_complete":
          return {
            ...job,
            phase: "done",
            log: addLog("Grading complete — result saved.", "success"),
          };

        case "grading_failed":
          return {
            ...job,
            phase: "error",
            error: String(ev.reason ?? "All grading providers exhausted."),
            log: addLog(`Grading failed: ${ev.reason}`, "error"),
          };

        case "confirmation_required":
          return {
            ...job,
            phase: "awaiting_confirm",
            log: addLog(
              "Gemini Pro unavailable — waiting for your confirmation to continue with OpenAI.",
              "warn",
            ),
          };

        default:
          return job;
      }
    }),
  );
}

async function drainSSEReader(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (eventType: string, rawData: string) => void,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";
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
        if (data) onEvent(eventType, data);
      }
    }
  } catch {
    // reader was cancelled — normal on cleanup or dismissal
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const GradingJobsContext = createContext<GradingJobsContextValue | null>(null);

export function GradingJobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<GradingJob[]>([]);
  const readersRef = useRef(new Map<string, ReadableStreamDefaultReader<Uint8Array>>());

  const trackJob = useCallback(
    ({
      requestId,
      studentId,
      studentName,
      studentCode,
      reader,
      fetchPromise,
    }: TrackJobParams) => {
      setJobs((prev) => [
        ...prev,
        {
          requestId,
          studentId,
          studentName,
          studentCode,
          phase: "grading",
          nodes: freshNodes(),
          log: [],
        },
      ]);

      if (reader) {
        readersRef.current.set(requestId, reader);
        // drainSSEReader and applySSEEvent are module-level; setJobs is stable.
        drainSSEReader(reader, (eventType, rawData) =>
          applySSEEvent(setJobs, requestId, eventType, rawData),
        );
      }

      // Watch the fetch for errors; SSE events drive the success path.
      fetchPromise
        .then((resp) => {
          if (!resp.ok) {
            return resp.text().then((text) => {
              setJobs((prev) =>
                prev.map((j) =>
                  j.requestId === requestId && j.phase !== "done" && j.phase !== "error"
                    ? { ...j, phase: "error", error: text || `HTTP ${resp.status}` }
                    : j,
                ),
              );
            });
          }
          // No-SSE fallback: if phase is still "grading" when HTTP resolves, mark done.
          setJobs((prev) =>
            prev.map((j) =>
              j.requestId === requestId && j.phase === "grading"
                ? { ...j, phase: "done" }
                : j,
            ),
          );
        })
        .catch((err: unknown) => {
          setJobs((prev) =>
            prev.map((j) =>
              j.requestId === requestId && j.phase !== "done" && j.phase !== "error"
                ? {
                    ...j,
                    phase: "error",
                    error: err instanceof Error ? err.message : "Request failed.",
                  }
                : j,
            ),
          );
        })
        .finally(() => {
          reader?.cancel().catch(() => {});
          readersRef.current.delete(requestId);
        });
    },
    [],
  );

  const confirmJob = useCallback(async (requestId: string, continueGrading: boolean) => {
    // Optimistic update first so the UI responds immediately.
    if (continueGrading) {
      setJobs((prev) =>
        prev.map((j) => (j.requestId === requestId ? { ...j, phase: "grading" } : j)),
      );
    } else {
      setJobs((prev) =>
        prev.map((j) =>
          j.requestId === requestId
            ? {
                ...j,
                phase: "error",
                error: "Submission cancelled.",
                log: [
                  ...j.log,
                  {
                    ts: nowHHMMSS(),
                    text: "Submission cancelled by publisher.",
                    level: "warn" as const,
                  },
                ],
              }
            : j,
        ),
      );
    }

    try {
      await fetch(`${API}/api/autograder/grade/confirm/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ continue_grading: continueGrading }),
      });
    } catch {
      // Network error — the grading_failed SSE event will still arrive and correct the state.
    }
  }, []);

  const dismissJob = useCallback((requestId: string) => {
    readersRef.current.get(requestId)?.cancel().catch(() => {});
    readersRef.current.delete(requestId);
    setJobs((prev) => prev.filter((j) => j.requestId !== requestId));
  }, []);

  const value = useMemo(
    () => ({ jobs, trackJob, confirmJob, dismissJob }),
    [jobs, trackJob, confirmJob, dismissJob],
  );

  return (
    <GradingJobsContext.Provider value={value}>
      {children}
    </GradingJobsContext.Provider>
  );
}

export function useGradingJobs(): GradingJobsContextValue {
  const ctx = useContext(GradingJobsContext);
  if (!ctx) throw new Error("useGradingJobs must be used within GradingJobsProvider");
  return ctx;
}
