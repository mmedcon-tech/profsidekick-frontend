export default function AutograderLandingPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Math Autograder</h1>
        <p className="mt-2 text-slate-600">Choose a workflow below.</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/autograder/submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Submit &amp; Grade
          </a>

          <a
            href="/autograder/students"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Student Management
          </a>

          <a
            href="/autograder/feedbacks"
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            View Feedbacks
          </a>

          <a
            href="/autograder/result"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            All Submissions (Professor View)
          </a>
        </div>
      </div>
    </main>
  );
}