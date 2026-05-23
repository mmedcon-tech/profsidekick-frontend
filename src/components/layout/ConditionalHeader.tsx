"use client";

import { usePathname } from "next/navigation";
import NavigationHeader from "./NavigationHeader";

export default function ConditionalHeader() {
  const pathname = usePathname();
  
  // Hide header for teaching interface routes (sessions/[id]/run/[runId])
  const shouldHideHeader = pathname?.includes('/sessions/') && pathname?.includes('/run/');
  
  if (shouldHideHeader) {
    return null;
  }
  
  return <NavigationHeader />;
} 