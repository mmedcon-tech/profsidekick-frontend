"use client";

import { usePathname } from "next/navigation";
import NavigationHeader from "./NavigationHeader";

// Routes that render their own sidebar — no top nav needed.
// Includes the role-based trees and all legacy (dashboard) group paths.
const SIDEBAR_PREFIXES = [
  '/publisher/',
  '/subscriber/',
  '/admin/',
  '/courses/',    // course detail, settings, students, sessions
  '/billing/',    // billing pages
  '/dashboard',   // main dashboard (exact + any sub-path)
  '/create',      // session creation
  '/professor/',  // professor persona
  '/profile',     // user profile
];

export default function ConditionalHeader() {
  const pathname = usePathname() ?? '';

  const hasSidebar = SIDEBAR_PREFIXES.some((p) => pathname.startsWith(p));

  if (hasSidebar) return null;

  return <NavigationHeader />;
}
