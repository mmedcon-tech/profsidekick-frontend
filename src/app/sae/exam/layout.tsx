"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function SAEExamLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.push("/login?next=/sae/exam");
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) return null;

  // ThemedLayout chrome is provided by the parent subscriber layout.
  // h-full propagates the flex-1 height so the exam split panel resolves correctly.
  return <div className="h-full flex flex-col">{children}</div>;
}
