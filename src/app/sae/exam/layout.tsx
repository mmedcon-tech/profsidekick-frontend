"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedLayout } from "@/components/layout/ThemedLayout";

export default function SAEExamLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.push("/login?next=/sae/exam");
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) return null;

  // ThemedLayout provides the sidebar + header shell.
  // The exam route is registered as fullscreen in ThemedLayout so the split-pane
  // ResultView can fill the available height without extra padding.
  return (
    <ThemedLayout>
      <div className="h-full flex flex-col">{children}</div>
    </ThemedLayout>
  );
}
