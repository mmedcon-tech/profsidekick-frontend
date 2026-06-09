"use client";

import React from "react";

interface Props {
  onSelect: (mode: "avatar" | "chat") => void;
  onClose: () => void;
  loading?: boolean;
}

export default function SubscriberRuntimeSelector({ onSelect, onClose, loading }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Choose Your Learning Experience</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Your instructor allows you to pick how you interact with the AI for this session.
        </p>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => onSelect("avatar")}
            disabled={loading}
            className="w-full flex items-start gap-4 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-left disabled:opacity-50"
          >
            <span className="text-3xl">🎙</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Avatar Mode</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Real-time voice conversation with the AI avatar. Best with headphones.
              </p>
            </div>
          </button>

          <button
            onClick={() => onSelect("chat")}
            disabled={loading}
            className="w-full flex items-start gap-4 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left disabled:opacity-50"
          >
            <span className="text-3xl">💬</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Chat Mode</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Text-based AI teaching. Works anywhere, no mic required.
              </p>
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          disabled={loading}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
