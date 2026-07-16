"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API = "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

type TranscriptPart = {
  model?: string;
  latex?: string;
  error?: string;
};

type TranscriptPayload = {
  draft_id: string;
  student_id: string;
  student_code: string;
  display_name: string;
  transcript: {
    handwritten?: TranscriptPart;
    webassign?: TranscriptPart;
  };
};

// ─── Draft PDF viewer ─────────────────────────────────────────────────────────
// This mirrors the existing submission PDF preview, but reads draft files instead.
// Draft files exist before grading, so this page can show PDFs immediately.

function DraftPdfViewer({
  draftId,
  fileType,
  label,
  height = 520,
}: {
  draftId: string;
  fileType: "handwritten" | "webassign";
  label: string;
  height?: number;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");
    setBlobUrl(null);

    const token = localStorage.getItem("auth_token") ?? "";

    fetch(`${API}/api/autograder/drafts/${draftId}/files/${fileType}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        if (blobRef.current) URL.revokeObjectURL(blobRef.current);
        const objectUrl = URL.createObjectURL(blob);
        blobRef.current = objectUrl;
        setBlobUrl(objectUrl);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [draftId, fileType]);

  return (
    <div className="flex flex-col">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      {loading && (
        <div
          className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50"
          style={{ height }}
        >
          <span className="text-sm text-slate-400">Loading PDF…</span>
        </div>
      )}

      {!loading && error && (
        <div
          className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50"
          style={{ height }}
        >
          <span className="text-sm text-red-500">Could not load PDF ({error})</span>
        </div>
      )}

      {!loading && blobUrl && (
        <iframe
          src={blobUrl}
          title={label}
          className="w-full rounded-lg border border-slate-200"
          style={{ height }}
        />
      )}
    </div>
  );
}

// ─── Transcript text card ─────────────────────────────────────────────────────
// For the demo, this displays raw LaTeX body content returned by Gemini.
// Later, this can become an editable LaTeX editor + rendered preview.

function TranscriptBox({
  title,
  transcript,
}: {
  title: string;
  transcript?: TranscriptPart;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>

      {transcript?.error && (
        <div className="mt-3 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
          Transcription error: {transcript.error}
        </div>
      )}

      <pre className="mt-3 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
        {transcript?.latex || "No transcript returned."}
      </pre>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AutograderTranscribePage() {
  const router = useRouter();
  const params = useParams();
  const draftId = String(params.draftId);

  const [payload, setPayload] = useState<TranscriptPayload | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function getToken() {
    return localStorage.getItem("auth_token") ?? "";
  }

  // Load transcript response stored by the submit page.
  // The PDFs themselves are loaded from the backend draft file endpoint.
  useEffect(() => {
    const raw = sessionStorage.getItem(`autograder_transcript_${draftId}`);
    if (raw) {
      setPayload(JSON.parse(raw));
    }
  }, [draftId]);

  async function submitForGrading() {
    setSubmitting(true);
    setSubmitError("");

    // Submit only the draft_id. The backend reads the already-uploaded PDFs from disk.
    const formData = new FormData();
    formData.append("draft_id", draftId);

    try {
      const resp = await fetch(`${API}/api/autograder/grade`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });

      if (!resp.ok) {
        throw new Error(await resp.text());
      }

      const data = await resp.json();

      // Existing feedback/result page remains unchanged.
      router.push(`/autograder/result/${data.submission_id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Grading failed.");
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600">Math Placement Test</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Transcript Preview
            </h1>
            <p className="mt-2 text-slate-600">
              Review the AI transcription. For this demo, grading still uses the original uploaded PDFs.
            </p>
            {payload && (
              <p className="mt-2 text-sm text-slate-500">
                {payload.student_code} — {payload.display_name}
              </p>
            )}
          </div>

          <button
            onClick={submitForGrading}
            disabled={submitting}
            className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting for Grading…" : "Submit for Grading"}
          </button>
        </div>

        {/* Error state */}
        {submitError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        {/* Session-storage fallback notice */}
        {!payload && (
          <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
            Transcript data was not found in this browser session. You can still submit for grading.
          </div>
        )}

        {/* Side-by-side PDF and transcript preview */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="space-y-6">
            <DraftPdfViewer
              draftId={draftId}
              fileType="webassign"
              label="Original WebAssign PDF"
            />
            <DraftPdfViewer
              draftId={draftId}
              fileType="handwritten"
              label="Original Handwritten PDF"
            />
          </div>

          <div className="space-y-6">
            <TranscriptBox
              title="WebAssign Transcript"
              transcript={payload?.transcript.webassign}
            />
            <TranscriptBox
              title="Handwritten Transcript"
              transcript={payload?.transcript.handwritten}
            />
          </div>
        </div>

        {/* Back link */}
        <div className="mt-6">
          <a href="/autograder/submit" className="text-sm text-slate-500 hover:underline">
            ← Back to upload
          </a>
        </div>
      </div>
    </main>
  );
}