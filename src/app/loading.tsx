"use client";

import { useEffect, useState } from "react";

export default function Loading() {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setStuck(true), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
      <div className="text-center max-w-sm px-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#133221] mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400 font-medium">Loading...</p>
        {stuck && (
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.clear();
              } catch {
                // ignore
              }
              window.location.replace("/login");
            }}
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#133221] px-4 text-sm font-medium text-white"
          >
            Stuck? Clear session & go to login
          </button>
        )}
      </div>
    </div>
  );
}
