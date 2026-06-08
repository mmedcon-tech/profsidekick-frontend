"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * ThemeToggle – a small icon button that switches between light and dark mode
 * using next-themes. Mounted lazily to avoid hydration mismatch.
 */
export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Only render after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-lg" aria-hidden="true" />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      id="theme-toggle"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="
        flex items-center justify-center w-9 h-9 rounded-lg
        text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 hover:bg-gray-100
        dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800
        transition-colors
      "
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
