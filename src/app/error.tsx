'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Something went wrong!</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{error.message}</p>
        <button
          onClick={reset}
          className="bg-emerald-600 dark:bg-emerald-700 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
} 