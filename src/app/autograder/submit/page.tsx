"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AutograderSubmitPage() {
  const router = useRouter();
  const [studentNetId, setStudentNetId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentAnswer, setStudentAnswer] = useState<File | null>(null);
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [webassignPdf, setWebassignPdf] = useState<File | null>(null);

  async function handleSubmit() {
    if (!studentNetId.trim()) {
      setError("Please enter your NetID.");
      return;
    }

    if (!studentName.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!webassignPdf) {
      setError("Please upload your solved WebAssign PDF.");
      return;
    }

    if (!studentAnswer) {
      setError("Please upload your answer file.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.append("student_net_id", studentNetId);
    formData.append("student_name", studentName);
    formData.append("student_answer", studentAnswer);
    formData.append("webassign_pdf", webassignPdf);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("http://localhost:8000/api/autograder/grade", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Submission failed.");
      }

      const data = await response.json();
      setSuccess("Uploaded successfully. Grading complete. You can now view your feedback.");
      setStudentAnswer(null);
      setWebassignPdf(null);
      setSubmissionId(data.submission_id);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-600">Math Placement Test</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Submit Your Work
          </h1>
          <p className="mt-2 text-slate-600">
            Enter your NetID and upload your handwritten answer PDF.
          </p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Student NetID
              </label>
              <input
                value={studentNetId}
                onChange={(event) => setStudentNetId(event.target.value)}
                // placeholder="e.g. ap1234"
                className="mt-2 w-full rounded-md border border-slate-300 p-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Student Name
              </label>
              <input
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                // placeholder="e.g. Aneeka Paul"
                className="mt-2 w-full rounded-md border border-slate-300 p-3 text-sm"
              />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700">
                    Solved WebAssign PDF
                </label>
                <input
                    type="file"
                    accept=".pdf"
                    onChange={(event) =>
                    setWebassignPdf(event.target.files?.[0] ?? null)
                    }
                    className="mt-2 block w-full rounded-md border border-slate-300 p-2 text-sm"
                />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Handwritten Work File
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(event) =>
                  setStudentAnswer(event.target.files?.[0] ?? null)
                }
                className="mt-2 block w-full rounded-md border border-slate-300 p-2 text-sm"
              />
              {/* <p className="mt-2 text-xs text-slate-500">
                Official questions and solutions are loaded securely from the backend.
              </p> */}
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <div className="flex gap-3">
                <button
                onClick={handleSubmit}
                disabled={loading}
                className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                {loading ? "Submitting..." : "Submit Answer"}
                </button>

                {submissionId && (
                    <a
                    href={`/autograder/result/${submissionId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
                    >
                    View Feedback
                    </a>
                )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

