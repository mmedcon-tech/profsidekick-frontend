"use client";

import { usePathname } from "next/navigation";
import NavigationHeader from "./NavigationHeader";

// Routes that render their own sidebar — no top nav needed
const SIDEBAR_PREFIXES = ['/publisher/', '/subscriber/', '/admin/'];

export default function ConditionalHeader() {
  const pathname = usePathname() ?? '';

  const hasSidebar = SIDEBAR_PREFIXES.some((p) => pathname.startsWith(p));
  const isTeachingRun =
    pathname.includes('/sessions/') && pathname.includes('/run/');

  if (hasSidebar || isTeachingRun) return null;

  return <NavigationHeader />;
}
