"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { validateInviteToken, setupAccount } from "@/lib/sae-api";
import { clearAuthSession, AUTH_USER_KEY } from "@/lib/authSession";
import type { SAETokenValidationResponse } from "@/types/sae";

type PageState =
  | { kind: "loading" }
  | { kind: "invalid"; reason: string }
  | { kind: "form"; tokenInfo: SAETokenValidationResponse }
  | { kind: "submitting" }
  | { kind: "error"; message: string };

export default function SAESetupPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [pageState, setPageState] = useState<PageState>({ kind: "loading" });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [existingSession, setExistingSession] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    // Detect if someone is already logged in so we can warn them
    const stored = localStorage.getItem(AUTH_USER_KEY);
    if (stored) {
      try {
        const u = JSON.parse(stored) as { username?: string };
        setExistingSession(u.username ?? "another account");
      } catch {
        setExistingSession("another account");
      }
    }
    validateInviteToken(token)
      .then((info) => setPageState({ kind: "form", tokenInfo: info }))
      .catch((err: Error) => setPageState({ kind: "invalid", reason: err.message }));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError("");

    if (username.trim().length < 3) {
      setFieldError("Username must be at least 3 characters.");
      return;
    }
    if (password.length < 8) {
      setFieldError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setFieldError("Passwords do not match.");
      return;
    }

    setPageState({ kind: "submitting" });

    try {
      const res = await setupAccount(token, username.trim(), password);
      // Clear any existing session (publisher/admin testing the link in the same browser)
      // before storing the student's JWT so there is no stale auth_user mismatch.
      clearAuthSession();
      localStorage.setItem("auth_token", res.access_token);
      // Redirect to the exam
      router.replace("/sae/exam");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Setup failed.";
      setPageState({ kind: "error", message });
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (pageState.kind === "loading") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Validating invitation link…</p>
      </main>
    );
  }

  // ── Invalid / expired ────────────────────────────────────────────────────────
  if (pageState.kind === "invalid") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-red-200 bg-white p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-600 text-xl font-bold">!</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 mb-2">
            Invalid Invitation Link
          </h1>
          <p className="text-sm text-slate-600">{pageState.reason}</p>
          <p className="mt-4 text-xs text-slate-400">
            Contact your instructor if you believe this is an error.
          </p>
        </div>
      </main>
    );
  }

  // ── Post-error recovery ──────────────────────────────────────────────────────
  if (pageState.kind === "error") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-red-200 bg-white p-8 shadow-sm text-center">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">
            Setup Failed
          </h1>
          <p className="text-sm text-red-600 mb-4">{pageState.message}</p>
          <button
            onClick={() => setPageState({ kind: "form", tokenInfo: (pageState as unknown as { tokenInfo: SAETokenValidationResponse }).tokenInfo ?? { valid: true, student_code: "", display_name: "" } })}
            className="text-sm text-blue-600 underline"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  const tokenInfo = pageState.kind === "form"
    ? pageState.tokenInfo
    : null;

  const isSubmitting = pageState.kind === "submitting";

  // ── Setup form ───────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">

        {/* Existing-session warning */}
        {existingSession && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Heads up:</span> You are currently signed in as{" "}
            <span className="font-semibold">{existingSession}</span>. Completing this setup
            will sign you out of that account. Open this link in a private/incognito window
            if you want to keep both sessions separate.
          </div>
        )}

        {/* Header */}
        <div className="mb-6 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-600 mb-1">
            Self Assessment Exam
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Account Setup</h1>
          {tokenInfo && (
            <p className="mt-2 text-sm text-slate-600">
              Welcome,{" "}
              <span className="font-semibold text-slate-800">
                {tokenInfo.display_name}
              </span>{" "}
              <span className="text-slate-400">({tokenInfo.student_code})</span>
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Choose a username and password. You will use these to log in
            for all future sessions.
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-xl border bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Username
              </label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. johndoe"
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm
                           focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                           disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                placeholder="At least 8 characters"
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm
                           focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                           disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={isSubmitting}
                placeholder="Repeat password"
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm
                           focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                           disabled:opacity-50"
              />
            </div>

            {fieldError && (
              <p className="text-sm text-red-600">{fieldError}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !username || !password || !confirm}
              className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white
                         hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60
                         transition-colors"
            >
              {isSubmitting ? "Setting up account…" : "Create Account & Enter Exam"}
            </button>
          </form>

          <p className="mt-4 text-xs text-slate-400 text-center">
            This link is single-use. Once you submit, it cannot be used again.
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Already set up?{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}
