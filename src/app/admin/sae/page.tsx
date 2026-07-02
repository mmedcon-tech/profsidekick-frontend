"use client";

import React, { useEffect, useState } from "react";
import { ClipboardList, Users, Search, CheckCircle, XCircle } from "lucide-react";
import { adminListSAEAssessments, adminListSAEStudents } from "@/lib/sae-api";
import type { SAEAdminAssessmentRow, SAEAdminStudentRow } from "@/types/sae";

type Tab = "assessments" | "students";

export default function AdminSAEPage() {
  const [tab, setTab] = useState<Tab>("assessments");

  const [assessments, setAssessments]   = useState<SAEAdminAssessmentRow[]>([]);
  const [students, setStudents]         = useState<SAEAdminStudentRow[]>([]);
  const [loadingA, setLoadingA]         = useState(true);
  const [loadingS, setLoadingS]         = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [filterAssessment, setFilterAssessment] = useState<string>("");
  const [studentSearch, setStudentSearch]       = useState("");

  useEffect(() => {
    adminListSAEAssessments()
      .then(setAssessments)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoadingA(false));
  }, []);

  useEffect(() => {
    if (tab !== "students") return;
    setLoadingS(true);
    setError(null);
    adminListSAEStudents(filterAssessment || undefined)
      .then(setStudents)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoadingS(false));
  }, [tab, filterAssessment]);

  const filteredStudents = studentSearch
    ? students.filter(
        (s) =>
          s.student_code.toLowerCase().includes(studentSearch.toLowerCase()) ||
          (s.user_username ?? "").toLowerCase().includes(studentSearch.toLowerCase()) ||
          s.assessment_name.toLowerCase().includes(studentSearch.toLowerCase())
      )
    : students;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList size={24} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Self Assessment Exams</h1>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {(["assessments", "students"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            {t === "assessments" ? "Assessments" : "Enrolled Students"}
          </button>
        ))}
      </div>

      {/* ── Assessments tab ──────────────────────────────────────────────────── */}
      {tab === "assessments" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Assessment</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Publisher</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Enrolled</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loadingA ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : assessments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    <ClipboardList size={32} className="mx-auto mb-2" />
                    No assessments found.
                  </td>
                </tr>
              ) : (
                assessments.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{a.name}</p>
                      {a.description && (
                        <p className="text-xs text-gray-400 truncate max-w-xs">{a.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">@{a.publisher_username}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <Users size={11} />
                        {a.enrolled_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setFilterAssessment(a.id);
                          setTab("students");
                        }}
                        className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                      >
                        View students →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Students tab ─────────────────────────────────────────────────────── */}
      {tab === "students" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Assessment filter */}
            <select
              value={filterAssessment}
              onChange={(e) => setFilterAssessment(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">All assessments</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (@{a.publisher_username})
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-64"
                placeholder="Search code, username, assessment…"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Student Code</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Assessment</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Publisher</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Activated</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Submissions</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loadingS ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      <Users size={32} className="mx-auto mb-2" />
                      No students found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="px-4 py-3 font-mono text-gray-900 dark:text-gray-100">{s.student_code}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s.assessment_name}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">@{s.publisher_username}</td>
                      <td className="px-4 py-3">
                        {s.is_activated ? (
                          <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 text-xs font-medium">
                            <CheckCircle size={13} />
                            {s.user_username ? `@${s.user_username}` : "Yes"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-400 text-xs">
                            <XCircle size={13} />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.submission_count}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
