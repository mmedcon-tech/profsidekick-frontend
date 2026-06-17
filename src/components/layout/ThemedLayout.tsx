"use client"

import React, { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { AppSidebarV2 } from "./app-sidebar"
import { AppHeaderV2 } from "./app-header"
import { FloatingAssistant } from "./floating-assistant"

function getTitle(pathname: string): string {
  if (pathname.includes("/dashboard")) return "Dashboard"
  if (pathname.includes("/courses")) return "Courses"
  if (pathname.includes("/sessions")) return "Live Session"
  if (pathname.includes("/analytics")) return "Analytics"
  if (pathname.includes("/billing")) return "Billing & Credits"
  if (pathname.includes("/profile")) return "Profile"
  if (pathname.includes("/marketplace")) return "Marketplace"
  if (pathname.includes("/avatars")) return "Avatars"
  if (pathname.includes("/programs")) return "Programs"
  if (pathname.includes("/templates")) return "Avatar Templates"
  if (pathname.includes("/models")) return "3D Model Catalog"
  if (pathname.includes("/users")) return "User Management"
  return "MyOS"
}

export function ThemedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()
  
  // We'll hardcode LTR for now, but in future it can be dynamic
  const dir = "ltr"
  
  const title = getTitle(pathname)
  
  // Session runtime gets full-height treatment
  const isFullScreen = pathname.includes("/run") || pathname.includes("/chat")

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // If no user is logged in, you might want to redirect or show a public shell.
  // For now, we assume this layout is used inside protected routes.

  return (
    <div dir={dir} className="flex h-screen overflow-hidden bg-background font-sans">
      <AppSidebarV2 />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeaderV2 title={title} />
        <main className="flex-1 overflow-y-auto">
          {isFullScreen ? (
            children
          ) : (
            <div className="p-4 sm:p-6">
              {children}
            </div>
          )}
        </main>
      </div>
      <FloatingAssistant />
    </div>
  )
}
