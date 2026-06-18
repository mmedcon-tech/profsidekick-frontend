"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { type Lang, type Role, type User, type Program, DEMO_USERS, programs } from "./data"

// ─── View types per role ──────────────────────────────────────────────────────

export type SubscriberView = "dashboard" | "courses" | "session" | "analytics" | "billing" | "profile" | "marketplace"
export type PublisherView = "dashboard" | "avatars" | "programs" | "analytics" | "courses"
export type AdminView = "dashboard" | "templates" | "models" | "analytics" | "users"
export type AnyView = SubscriberView | PublisherView | AdminView

// ─── Context shape ────────────────────────────────────────────────────────────

interface AppState {
  // Auth
  user: User | null
  login: (username: string, password: string) => boolean
  logout: () => void

  // Language / direction
  lang: Lang
  setLang: (l: Lang) => void
  toggleLang: () => void
  dir: "rtl" | "ltr"

  // Program context (subscriber / publisher)
  activeProgram: Program | null
  setActiveProgram: (program: Program | null) => void
  userPrograms: Program[]

  // Navigation
  view: AnyView
  setView: (v: AnyView) => void

  // Active content IDs
  activeCourseId: string | null
  setActiveCourseId: (id: string | null) => void
  activeSessionId: string | null
  setActiveSessionId: (id: string | null) => void
  activeAvatarId: string | null
  setActiveAvatarId: (id: string | null) => void
  activeTemplateId: string | null
  setActiveTemplateId: (id: string | null) => void

  // AI Navigation Assistant
  assistantOpen: boolean
  setAssistantOpen: (v: boolean) => void
  pendingMessage: string | null
  sendToAssistant: (msg: string) => void
  consumePending: () => void
}

const Ctx = createContext<AppState | null>(null)

export function AppProviderV2({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [lang, setLang] = useState<Lang>("en")
  const [view, setView] = useState<AnyView>("dashboard")
  const [activeProgram, setActiveProgramState] = useState<Program | null>(null)
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [activeAvatarId, setActiveAvatarId] = useState<string | null>(null)
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)

  const toggleLang = useCallback(() => setLang((l) => (l === "en" ? "ar" : "en")), [])

  const login = useCallback((username: string, password: string): boolean => {
    const record = DEMO_USERS[username.toLowerCase()]
    if (!record || record.password !== password) return false
    const { password: _pw, ...u } = record
    setUser(u)
    setView("dashboard")
    // Auto-set active program from user's last selected program
    if (u.currentProgramId) {
      const prog = programs.find((p) => p.id === u.currentProgramId) ?? null
      setActiveProgramState(prog)
    }
    return true
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setActiveProgramState(null)
    setView("dashboard")
    setActiveCourseId(null)
    setActiveSessionId(null)
    setActiveAvatarId(null)
    setActiveTemplateId(null)
  }, [])

  const setActiveProgram = useCallback((program: Program | null) => {
    setActiveProgramState(program)
    setView("dashboard")
    setActiveCourseId(null)
    setActiveSessionId(null)
  }, [])

  const sendToAssistant = useCallback((msg: string) => {
    setPendingMessage(msg)
    setAssistantOpen(true)
  }, [])

  const consumePending = useCallback(() => setPendingMessage(null), [])

  // Programs the current user belongs to
  const userPrograms = user
    ? programs.filter((p) => p.memberIds.includes(user.id) || p.publisherId === user.id)
    : []

  return (
    <Ctx.Provider
      value={{
        user,
        login,
        logout,
        lang,
        setLang,
        toggleLang,
        dir: lang === "ar" ? "rtl" : "ltr",
        activeProgram,
        setActiveProgram,
        userPrograms,
        view,
        setView,
        activeCourseId,
        setActiveCourseId,
        activeSessionId,
        setActiveSessionId,
        activeAvatarId,
        setActiveAvatarId,
        activeTemplateId,
        setActiveTemplateId,
        assistantOpen,
        setAssistantOpen,
        pendingMessage,
        sendToAssistant,
        consumePending,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAppV2() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useAppV2 must be used within AppProviderV2")
  return ctx
}
