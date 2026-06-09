"use client";

import React from 'react';

export default function AuthLoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
      <div className="text-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#133221] mx-auto mb-4"
          role="status"
          aria-label="Loading"
        />
        <p className="text-gray-600 dark:text-gray-400 font-medium">Loading...</p>
      </div>
    </div>
  );
}
