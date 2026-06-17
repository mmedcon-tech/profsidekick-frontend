"use client"

import { useAppV2 } from "@/lib/v2/context"
import { LoginViewV2 } from "./login-view"
import { AppSidebarV2 } from "./app-sidebar"
import { AppHeaderV2 } from "./app-header"
import { FloatingAssistant } from "./floating-assistant"
import { ThemeConfigProvider } from "./ThemeConfigProvider"

// Subscriber
import { SubscriberDashboard } from "./subscriber/dashboard"
import { SubscriberCoursesView } from "./subscriber/courses-view"
import { SessionRuntime } from "./subscriber/session-runtime"
import { SubscriberAnalytics } from "./subscriber/analytics-view"
import { SubscriberBilling } from "./subscriber/billing-view"
import { SubscriberProfile } from "./subscriber/profile-view"
import { SubscriberMarketplace } from "./subscriber/marketplace-view"

// Publisher
import { PublisherDashboard } from "./publisher/dashboard"
import { PublisherAvatarsView } from "./publisher/avatars-view"
import { PublisherProgramsView } from "./publisher/programs-view"
import { PublisherAvatarDetail } from "./publisher/avatar-detail"
import { PublisherCourseDetail } from "./publisher/course-detail"

// Admin
import {
  AdminDashboard,
  AdminTemplatesView,
  AdminModelsView,
  AdminAnalytics,
} from "./admin/admin-views"
import { UsersView } from "./admin/users-view"
import { AdminTemplateDetail } from "./admin/template-detail"

function getTitle(view: string, lang: "en" | "ar"): string {
  const map: Record<string, { en: string; ar: string }> = {
    dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
    courses: { en: "Courses", ar: "الدورات" },
    session: { en: "Live Session", ar: "جلسة مباشرة" },
    analytics: { en: "Analytics", ar: "التحليلات" },
    billing: { en: "Billing & Credits", ar: "الفواتير والرصيد" },
    profile: { en: "Profile", ar: "الملف الشخصي" },
    marketplace: { en: "Marketplace", ar: "السوق" },
    avatars: { en: "My Avatars", ar: "مساعداتي" },
    programs: { en: "Programs", ar: "البرامج" },
    templates: { en: "Avatar Templates", ar: "قوالب المساعدين" },
    models: { en: "3D Model Catalog", ar: "كتالوج النماذج" },
    users: { en: "User Management", ar: "إدارة المستخدمين" },
  }
  return map[view]?.[lang] ?? view
}

function SubscriberShell() {
  const { view, setView, setActiveCourseId, setActiveSessionId, activeCourseId, activeSessionId } = useAppV2()

  function handleOpenCourse(id: string) {
    setActiveCourseId(id)
    setView("courses")
  }

  function handleStartSession(sessionId: string, courseId: string) {
    setActiveCourseId(courseId)
    setActiveSessionId(sessionId)
    setView("session")
  }

  function handleEndSession() {
    setView("courses")
    setActiveSessionId(null)
  }

  if (view === "session" && activeSessionId && activeCourseId) {
    return (
      <SessionRuntime
        sessionId={activeSessionId}
        courseId={activeCourseId}
        onEnd={handleEndSession}
      />
    )
  }

  if (view === "courses") return <SubscriberCoursesView onStartSession={handleStartSession} />
  if (view === "analytics") return <SubscriberAnalytics />
  if (view === "billing") return <SubscriberBilling />
  if (view === "profile") return <SubscriberProfile />
  if (view === "marketplace") return <SubscriberMarketplace />

  return <SubscriberDashboard onOpenCourse={handleOpenCourse} />
}

function PublisherShell() {
  const { view, setView, activeAvatarId, setActiveAvatarId, activeCourseId, setActiveCourseId } = useAppV2()

  if (view === "avatars" && activeAvatarId) {
    return <PublisherAvatarDetail avatarId={activeAvatarId} onBack={() => { setActiveAvatarId(null) }} />
  }
  if (view === "courses" && activeCourseId) {
    return <PublisherCourseDetail courseId={activeCourseId} onBack={() => { setActiveCourseId(null); setView("courses") }} />
  }
  if (view === "avatars") return <PublisherAvatarsView />
  if (view === "programs") return <PublisherProgramsView />
  if (view === "analytics") return <AdminAnalytics />
  return <PublisherDashboard />
}

function AdminShell() {
  const { view, setView, activeTemplateId, setActiveTemplateId } = useAppV2()

  if (view === "templates" && activeTemplateId) {
    return <AdminTemplateDetail templateId={activeTemplateId} onBack={() => setActiveTemplateId(null)} />
  }
  if (view === "templates") return <AdminTemplatesView />
  if (view === "models") return <AdminModelsView />
  if (view === "users") return <UsersView />
  if (view === "analytics") return <AdminAnalytics />
  return <AdminDashboard />
}

export function AppShellV2() {
  const { user, view, lang, dir, activeProgram } = useAppV2()

  if (!user) return <LoginViewV2 />

  const title = getTitle(view, lang)

  // Session runtime gets full-height treatment (no scroll padding)
  const isFullScreen = view === "session"

  return (
    <ThemeConfigProvider themeConfig={activeProgram?.themeConfig}>
      <div dir={dir} className="flex h-screen overflow-hidden bg-background font-sans">
        <AppSidebarV2 />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeaderV2 title={title} />
          <main className="flex-1 overflow-y-auto">
            {isFullScreen ? (
              // Full-height, no padding for session runtime
              <>
                {user.role === "subscriber" && <SubscriberShell />}
              </>
            ) : (
              <div className="p-4 sm:p-6">
                {user.role === "subscriber" && <SubscriberShell />}
                {user.role === "publisher" && <PublisherShell />}
                {user.role === "admin" && <AdminShell />}
              </div>
            )}
          </main>
        </div>
        <FloatingAssistant />
      </div>
    </ThemeConfigProvider>
  )
}
