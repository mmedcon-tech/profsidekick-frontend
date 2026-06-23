"use client";

import { useEffect, useRef, useState } from "react";

const API = "http://localhost:8000";

type Props = {
  submissionId: string;
  fileType: "handwritten" | "webassign";
  label: string;
  height?: number;
};

export function PdfViewer({ submissionId, fileType, label, height = 480 }: Props) {
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
    const url = `${API}/api/autograder/submissions/${submissionId}/files/${fileType}`;

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
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
  }, [submissionId, fileType]);

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
