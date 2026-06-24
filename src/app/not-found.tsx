import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4">404</h2>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">Page not found</p>
        <Link
          href="/"
          className="bg-primary dark:bg-primary/90 text-white px-6 py-2 rounded-lg hover:bg-primary/90 dark:hover:bg-primary transition-colors inline-block"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
} 