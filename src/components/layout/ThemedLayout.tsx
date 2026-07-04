"use client"

import React, { useState } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { ProgramContextProvider } from "@/contexts/ProgramContext"

import ProgramThemeProvider from "./ProgramThemeProvider"
import { AppSidebarV2, MobileNavDrawer } from "./app-sidebar"
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

function ThemedLayoutInner({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth()
  const pathname = usePathname()
  const title = getTitle(pathname)
  const isFullScreen = pathname.includes("/run") || pathname.includes("/chat")
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div dir="ltr" className="flex h-screen overflow-hidden bg-background font-sans">
      {/* Desktop sidebar */}
      <AppSidebarV2 />

      {/* Mobile slide-in drawer */}
      <MobileNavDrawer isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeaderV2 title={title} onMenuClick={() => setMobileNavOpen(true)} />
        <main className={`min-h-0 flex-1 ${isFullScreen ? "overflow-hidden" : "overflow-y-auto"}`}>
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

export function ThemedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProgramContextProvider>
      <ProgramThemeProvider>
        <ThemedLayoutInner>{children}</ThemedLayoutInner>
      </ProgramThemeProvider>
    </ProgramContextProvider>
  )
}
