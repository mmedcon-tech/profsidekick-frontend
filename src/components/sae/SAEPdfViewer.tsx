"use client";

/**
 * SAEPdfViewer
 *
 * Fetches a PDF from an authenticated endpoint on mount, creates a browser
 * blob URL, and renders it in a native <iframe> — giving the user the
 * browser's built-in viewer (zoom, page nav, print) without any library.
 *
 * Usage pattern: mount with a `key` prop that changes when the PDF source
 * changes (e.g. switching between handwritten/webassign). The component
 * self-manages the fetch and blob lifecycle.
 *
 *   <SAEPdfViewer
 *     key={`${studentId}-${activeFile}`}
 *     fetchPdf={() => fetchPublisherStudentFile(studentId, activeFile)}
 *     label="Handwritten Solutions"
 *   />
 */

import { useEffect, useRef, useState } from "react";

interface Props {
  /** Called once on mount. Should return the raw PDF bytes. */
  fetchPdf: () => Promise<ArrayBuffer>;
  /** Optional label shown in a thin bar above the iframe. */
  label?: string;
}

type LoadState = "loading" | "ready" | "error";

export default function SAEPdfViewer({ fetchPdf, label }: Props) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const buffer = await fetchPdf();
        if (cancelled) return;

        const blob = new Blob([buffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;

        if (iframeRef.current) {
          iframeRef.current.src = url;
        }
        setLoadState("ready");
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : "Failed to load PDF.");
        setLoadState("error");
      }
    }

    load();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
    // Intentionally empty deps — this component is remounted via key when
    // the PDF source changes. fetchPdf is stable within a single mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-100">
      {/* Optional label strip */}
      {label && (
        <div className="shrink-0 px-3 py-1.5 bg-slate-200 border-b border-slate-300 text-xs font-medium text-slate-600 truncate">
          {label}
        </div>
      )}

      {/* Viewer area */}
      <div className="relative flex-1 min-h-0">
        {/* Loading overlay */}
        {loadState === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-10">
            <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
            <p className="mt-3 text-xs text-slate-500">Loading PDF…</p>
          </div>
        )}

        {/* Error overlay */}
        {loadState === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-10 p-6 text-center">
            <div className="mb-3 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-red-600 font-bold text-lg">!</span>
            </div>
            <p className="text-sm font-medium text-slate-800">Could not load PDF</p>
            <p className="mt-1 text-xs text-slate-500">{errorMsg}</p>
          </div>
        )}

        {/* The iframe is always in the DOM; src is set after the blob is ready.
            This avoids a flash when toggling display visibility. */}
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          title={label ?? "PDF Viewer"}
          style={{ opacity: loadState === "ready" ? 1 : 0 }}
        />
      </div>
    </div>
  );
}
