import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-6">Session Run Not Found</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          The teaching session run you are looking for does not exist or has expired.
        </p>
        <Link 
          href="/dashboard"
          className="bg-emerald-600 dark:bg-emerald-700 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
} 