"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { validateInviteToken, setupAccount } from "@/lib/sae-api";
import { clearAuthSession, AUTH_USER_KEY } from "@/lib/authSession";
import type { SAETokenValidationResponse } from "@/types/sae";

// ── Static option lists ───────────────────────────────────────────────────────

const CURRICULUM_OPTIONS = [
  "IB (International Baccalaureate)",
  "A Levels (UK)",
  "American High School Diploma",
  "CBSE (India)",
  "Ethiopian National Curriculum",
  "French Baccalauréat",
  "German Abitur",
  "Canadian High School Diploma",
  "Other",
] as const;

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain",
  "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria",
  "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros",
  "Congo (Brazzaville)", "Congo (Kinshasa)", "Costa Rica", "Croatia", "Cuba",
  "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica",
  "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea",
  "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada",
  "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras",
  "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland",
  "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya",
  "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho",
  "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar",
  "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands",
  "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco",
  "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia",
  "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger",
  "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru",
  "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
  "Samoa", "San Marino", "São Tomé and Príncipe", "Saudi Arabia", "Senegal",
  "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia",
  "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan",
  "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo",
  "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States",
  "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen", "Zambia", "Zimbabwe",
] as const;

// ── Page state ─────────────────────────────────────────────────────────────────

type PageState =
  | { kind: "loading" }
  | { kind: "invalid"; reason: string }
  | { kind: "form"; tokenInfo: SAETokenValidationResponse }
  | { kind: "submitting" }
  | { kind: "error"; message: string; tokenInfo: SAETokenValidationResponse };

// ── Component ──────────────────────────────────────────────────────────────────

export default function SAESetupPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [pageState, setPageState] = useState<PageState>({ kind: "loading" });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [country, setCountry] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [curriculumOther, setCurriculumOther] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [existingSession, setExistingSession] = useState<string | null>(null);
  const [isExistingAccount, setIsExistingAccount] = useState(false);

  const isOtherCurriculum = curriculum === "Other";
  const effectiveCurriculum = isOtherCurriculum ? curriculumOther.trim() : curriculum;

  useEffect(() => {
    if (!token) return;
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

    const tokenInfo = pageState.kind === "form" ? pageState.tokenInfo : null;
    if (!tokenInfo) return;

    const isFirstUse = tokenInfo.is_first_use;

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

    // Country and curriculum required only on first use when creating a new account
    if (isFirstUse && !isExistingAccount) {
      if (!country) {
        setFieldError("Please select your country of origin.");
        return;
      }
      if (!curriculum) {
        setFieldError("Please select your high school curriculum.");
        return;
      }
      if (isOtherCurriculum && curriculumOther.trim().length < 1) {
        setFieldError("Please describe your curriculum.");
        return;
      }
    }

    setPageState({ kind: "submitting" });

    try {
      const res = await setupAccount(
        token,
        username.trim(),
        password,
        isFirstUse ? country : "",
        isFirstUse ? effectiveCurriculum : "",
        isExistingAccount,
      );
      clearAuthSession();
      localStorage.setItem("auth_token", res.access_token);
      router.replace("/sae/exam");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Setup failed.";
      setPageState({ kind: "error", message, tokenInfo });
    }
  }

  // ── Render: loading ───────────────────────────────────────────────────────────
  if (pageState.kind === "loading") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Validating invitation link…</p>
      </main>
    );
  }

  // ── Render: invalid / expired ─────────────────────────────────────────────────
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

  // ── Render: post-error recovery ───────────────────────────────────────────────
  if (pageState.kind === "error") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-red-200 bg-white p-8 shadow-sm text-center">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">Setup Failed</h1>
          <p className="text-sm text-red-600 mb-4">{pageState.message}</p>
          <button
            onClick={() =>
              setPageState({ kind: "form", tokenInfo: pageState.tokenInfo })
            }
            className="text-sm text-blue-600 underline"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  const tokenInfo = pageState.kind === "form" ? pageState.tokenInfo : null;
  const isSubmitting = pageState.kind === "submitting";
  const isFirstUse = tokenInfo?.is_first_use ?? true;
  const showEducationFields = isFirstUse && !isExistingAccount;

  const inputCls =
    "w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm " +
    "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 " +
    "disabled:opacity-50 bg-white";

  const labelCls = "block text-sm font-medium text-slate-700 mb-1";

  // ── Render: setup form ────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full">

        {/* Existing-session warning */}
        {existingSession && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Heads up:</span> You are currently signed in as{" "}
            <span className="font-semibold">{existingSession}</span>. Completing this setup
            will sign you out of that account. Open this link in a private/incognito window
            to keep both sessions separate.
          </div>
        )}

        {/* Header */}
        <div className="mb-6 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-600 mb-1">
            Self Assessment Exam
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            {!isFirstUse
              ? "Update Credentials"
              : isExistingAccount
              ? "Log In to Your Account"
              : "Account Setup"}
          </h1>
          {tokenInfo && (
            <p className="mt-2 text-sm text-slate-600">
              Welcome,{" "}
              <span className="font-semibold text-slate-800">{tokenInfo.display_name}</span>{" "}
              <span className="text-slate-400">({tokenInfo.student_code})</span>
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {!isFirstUse
              ? "Choose a new username and password. Your previous submissions are preserved."
              : isExistingAccount
              ? "Log in with your existing account to gain access to this assessment."
              : "Choose a username and password — you will use these to log in for all future sessions. No real name is required."}
          </p>
        </div>

        {/* Mode toggle — shown only on first use so returning students see it immediately */}
        {isFirstUse && (
          <div className="mb-4 flex rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => { setIsExistingAccount(false); setFieldError(""); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                !isExistingAccount
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              New Account
            </button>
            <button
              type="button"
              onClick={() => { setIsExistingAccount(true); setFieldError(""); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                isExistingAccount
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              I Already Have an Account
            </button>
          </div>
        )}

        {/* Form card */}
        <div className="rounded-xl border bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── Account credentials ── */}
            <div>
              <label className={labelCls}>Username</label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. johndoe"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Password</label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                placeholder="At least 8 characters"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Confirm Password</label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={isSubmitting}
                placeholder="Repeat password"
                className={inputCls}
              />
            </div>

            {/* ── Educational background — first use, new account only ── */}
            {showEducationFields && (
              <>
                <div className="relative my-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-2 text-slate-400 uppercase tracking-wider">
                      Educational Background
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 -mt-2">
                  This information is used to personalise your exam experience. It is
                  not linked to your real name.
                </p>

                <div>
                  <label className={labelCls}>
                    Country of Origin <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    disabled={isSubmitting}
                    className={inputCls}
                  >
                    <option value="" disabled>Select your country…</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>
                    High School Curriculum <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={curriculum}
                    onChange={(e) => {
                      setCurriculum(e.target.value);
                      if (e.target.value !== "Other") setCurriculumOther("");
                    }}
                    disabled={isSubmitting}
                    className={inputCls}
                  >
                    <option value="" disabled>Select your curriculum…</option>
                    {CURRICULUM_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {isOtherCurriculum && (
                  <div>
                    <label className={labelCls}>
                      Please describe your curriculum <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={curriculumOther}
                      onChange={(e) => setCurriculumOther(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="e.g. Nigerian WAEC, Turkish YKS…"
                      className={inputCls}
                      autoFocus
                    />
                  </div>
                )}
              </>
            )}

            {/* ── Validation error ── */}
            {fieldError && (
              <p className="text-sm text-red-600">{fieldError}</p>
            )}

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !username ||
                !password ||
                !confirm ||
                (showEducationFields && (!country || !curriculum || (isOtherCurriculum && !curriculumOther.trim())))
              }
              className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white
                         hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60
                         transition-colors"
            >
              {isSubmitting
                ? (!isFirstUse ? "Updating credentials…" : isExistingAccount ? "Logging in…" : "Setting up account…")
                : (!isFirstUse ? "Update Credentials & Continue" : isExistingAccount ? "Log In & Enter Exam" : "Create Account & Enter Exam")}
            </button>
          </form>

          <p className="mt-4 text-xs text-slate-400 text-center">
            {!isFirstUse
              ? "Your previous submissions and grades are preserved."
              : "This link is valid for one more use after setup."}
          </p>
        </div>

      </div>
    </main>
  );
}
