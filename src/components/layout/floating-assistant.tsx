"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { tr } from "@/lib/v2/i18n"
import { useSpeech } from "@/lib/v2/use-speech"
import { cn } from "@/lib/utils"
import {
  Mic,
  Send,
  Sparkles,
  Square,
  Phone,
  PhoneOff,
  MessageSquare,
  Volume2,
  VolumeX,
  RotateCcw,
  X,
} from "lucide-react"
import Image from "next/image"
import { ChatbotAvatar3D, preloadChatbotAvatar } from "@/components/layout/ChatbotAvatar3D"
import { useDraggable } from "@/hooks/useDraggable"
import { useAssistantAvatar } from "@/hooks/useAssistantAvatar"
import { useAssistantPlatformAvatar } from "@/hooks/useAssistantPlatformAvatar"
import {
  getAvatarLibraryEntry,
  resolvePortraitPresentation,
} from "@/lib/avatarLibrary"
import {
  ASSISTANT_PLATFORM_AVATAR_IDS,
} from "@/lib/assistantPlatformAvatars"
import {
  getQuickNavActions,
  resolveNavDestination,
  type NavDestination,
} from "@/lib/navigation"

// Lightweight static orb for launcher/header — mirrors the active 3D avatar
function AvatarOrbV2({
  size = 44,
  speaking = false,
  src,
  alt,
  objectPosition = "center 20%",
}: {
  size?: number
  speaking?: boolean
  src: string
  alt: string
  objectPosition?: string
}) {
  return (
    <div
      className="relative shrink-0 rounded-full overflow-hidden"
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="h-full w-full object-cover"
        style={{ objectPosition }}
      />
      {speaking && (
        <span className="absolute bottom-0 end-0 flex h-3 w-3 items-center justify-center rounded-full bg-accent ring-2 ring-card">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-foreground" />
        </span>
      )}
    </div>
  )
}

interface ChatMsg {
  id: string
  role: "user" | "assistant"
  text: string
}

let _id = 0
const uid = () => `m${++_id}`

type Mode = "chat" | "call"

function getReply(input: string, lang: "en" | "ar", userName: string): string {
  const q = input.toLowerCase()
  const has = (...w: string[]) => w.some((x) => q.includes(x))

  if (has("hello", "hi", "مرحبا", "أهلا", "اهلا")) {
    return lang === "ar"
      ? `أهلًا ${userName}، أنا مساعدك في منصة MyOS. كيف يمكنني مساعدتك؟`
      : `Hello ${userName}, I'm your MyOS assistant. How can I help you today?`
  }
  if (has("navigate", "go to", "where", "اذهب", "انتقل", "أين")) {
    return lang === "ar"
      ? "يمكنك التنقل باستخدام القائمة الجانبية على اليسار. أي قسم تبحث عنه؟"
      : "You can navigate using the sidebar on the left. Which section are you looking for?"
  }
  if (has("course", "دورة", "تدريب")) {
    return lang === "ar"
      ? "يمكنك الوصول إلى دوراتك من قائمة «الدورات» في الشريط الجانبي. هل تريد بدء جلسة جديدة؟"
      : "You can access your courses from the Courses section in the sidebar. Would you like to start a new session?"
  }
  if (has("session", "جلسة")) {
    return lang === "ar"
      ? "لبدء جلسة، انتقل إلى الدورات، واختر دورة، ثم اضغط «بدء الجلسة». سيفتح واجهة المحاضر الحي."
      : "To start a session, go to Courses, pick a course, then tap Start Session. The live avatar interface will open."
  }
  if (has("avatar", "مساعد")) {
    return lang === "ar"
      ? "يمكنك تخصيص المساعد الافتراضي من إعدادات البرنامج. الناشر يمكنه اختيار الصوت والشخصية والنموذج."
      : "You can customise the avatar from Program settings. Publishers can choose the voice, persona, and 3D model."
  }
  if (has("help", "مساعدة", "ساعد")) {
    return lang === "ar"
      ? "أنا هنا لمساعدتك في التنقل والتدريب وفهم المحتوى. ماذا تحتاج؟"
      : "I'm here to help with navigation, training, and understanding content. What do you need?"
  }
  return lang === "ar"
    ? "يمكنني مساعدتك في التنقل بالمنصة أو الإجابة على أسئلتك. اسألني أي شيء."
    : "I can help you navigate the platform or answer your questions. Ask me anything."
}

function isGenericCannedReply(reply: string, lang: "en" | "ar"): boolean {
  return lang === "ar"
    ? reply.startsWith("يمكنني مساعدتك")
    : reply.startsWith("I can help you navigate")
}

export function FloatingAssistant() {
  const { user } = useAuth()
  const router = useRouter()
  const { avatar: subscribedAvatar } = useAssistantAvatar()
  const lang = subscribedAvatar.language
  const {
    avatar,
    portraitSrc,
    alternatePortraitSrc,
    alternateName,
    toggleAvatar,
    activeId,
  } = useAssistantPlatformAvatar(lang)
  const activePortrait = resolvePortraitPresentation(
    getAvatarLibraryEntry(activeId) ?? getAvatarLibraryEntry("avatar-1")!,
  )
  const alternatePortrait = resolvePortraitPresentation(
    getAvatarLibraryEntry(activeId === "avatar-1" ? "avatar-2" : "avatar-1")!,
  )
  const dir = lang === "ar" ? "rtl" : "ltr"

  const [assistantOpen, setAssistantOpen] = useState(false)
  const [mode, setMode] = useState<Mode>("chat")
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState("")
  const [typing, setTyping] = useState(false)
  const [muted, setMuted] = useState(false)
  const [caption, setCaption] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const mutedRef = useRef(muted)
  const pendingCaptionRef = useRef("")
  const replyAbortRef = useRef<AbortController | null>(null)
  const modeRef = useRef(mode)
  mutedRef.current = muted
  modeRef.current = mode

  // Draggable widget: launcher and panel share one offset so it stays where
  // the user dropped it across open/close. Persisted to localStorage.
  const { containerRef, offset, isDragging, dragHandleProps, wasDragged, reclamp } =
    useDraggable("myos-assistant-position")
  const dragStyle = { transform: `translate(${offset.x}px, ${offset.y}px)` }

  // Warm both Emirati GLBs on idle so switching in call mode is instant.
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => number
      cancelIdleCallback?: (id: number) => void
    }
    const schedule = w.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500))
    const id = schedule(() => {
      for (const avatarId of ASSISTANT_PLATFORM_AVATAR_IDS) {
        preloadChatbotAvatar(getAvatarLibraryEntry(avatarId)?.glbPath)
      }
    })
    return () => {
      if (w.cancelIdleCallback && typeof id === "number") w.cancelIdleCallback(id)
      else window.clearTimeout(id as unknown as number)
    }
  }, [])

  function switchCallAvatar() {
    stopSpeaking()
    toggleAvatar()
  }

  // Re-clamp into view when the panel opens or switches size (chat ↔ call).
  useEffect(() => {
    if (assistantOpen) reclamp()
  }, [assistantOpen, mode, reclamp])

  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent<boolean | undefined>
      if (customEvent.detail !== undefined) {
        setAssistantOpen(customEvent.detail)
      } else {
        setAssistantOpen((prev) => !prev)
      }
    }
    window.addEventListener("toggle-assistant", handleToggle)
    return () => window.removeEventListener("toggle-assistant", handleToggle)
  }, [])

  const {
    speaking,
    listening,
    interim,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    visemeTimeline,
    getSpeechTime,
    getAudioLevel,
  } = useSpeech(lang, avatar.voice)

  const assistantName = lang === "ar" ? "مساعد MyOS" : "MyOS Assistant"
  const userName = user ? `${user.firstName} ${user.lastName}` : ""

  // Greet on first open
  useEffect(() => {
    if (assistantOpen && messages.length === 0) {
      const greet =
        lang === "ar"
          ? `مرحبًا ${userName}، أنا مساعدك في منصة MyOS. يمكنني مساعدتك في التنقل والتدريب.`
          : `Hello ${userName}, I'm your MyOS assistant. I can help you navigate and train on the platform.`
      setMessages([{ id: uid(), role: "assistant", text: greet }])
    }
  }, [assistantOpen, messages.length, lang, userName])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, typing])

  useEffect(() => {
    if (!assistantOpen || mode !== "call") {
      stopSpeaking()
      stopListening()
    }
  }, [assistantOpen, mode, stopSpeaking, stopListening])

  // Show call captions only once audio actually starts — not while TTS is loading.
  useEffect(() => {
    if (mode !== "call") return
    if (speaking && pendingCaptionRef.current) {
      setCaption(pendingCaptionRef.current)
    }
    if (!speaking) {
      pendingCaptionRef.current = ""
    }
  }, [speaking, mode])

  // Emit an assistant message (and speak it while in call mode).
  function emitAssistant(answer: string) {
    setMessages((m) => [...m, { id: uid(), role: "assistant", text: answer }])
    setTyping(false)
    if (modeRef.current === "call" && !mutedRef.current) {
      pendingCaptionRef.current = answer
      setCaption(lang === "ar" ? "جارٍ التحدث..." : "Speaking...")
      speak(answer, undefined, { lowLatency: true })
    }
  }

  async function reply(text: string) {
    replyAbortRef.current?.abort()
    const controller = new AbortController()
    replyAbortRef.current = controller

    stopSpeaking()
    setTyping(true)
    if (modeRef.current === "call") {
      pendingCaptionRef.current = ""
      setCaption(lang === "ar" ? "جارٍ التفكير..." : "Thinking...")
    }

    // Role-aware navigation first: resolve the intent to a real route the current
    // user can access, then navigate there immediately.
    const dest = resolveNavDestination(user?.role, text)
    if (dest) {
      router.push(dest.route)
      emitAssistant(
        lang === "ar"
          ? `جاري الانتقال إلى ${dest.label.ar}...`
          : `Navigating to ${dest.label.en}...`,
      )
      return
    }

    // In call mode, skip the API for common platform questions (instant reply).
    if (modeRef.current === "call") {
      const quick = getReply(text, lang, userName)
      if (!isGenericCannedReply(quick, lang)) {
        emitAssistant(quick)
        return
      }
    }

    // Everything else goes to the real AI assistant for a genuine answer.
    try {
      const isCall = modeRef.current === "call"
      const history = messages
        .slice(isCall ? -4 : -8)
        .map((m) => ({ role: m.role, text: m.text }))
      const basePrompt =
        lang === "ar"
          ? `أنت ${assistantName}، مساعد تعليمي ودود على منصة MyOS (ProfSidekick)${userName ? ` تساعد ${userName}` : ""}. أجب عن أسئلة المستخدم بوضوح واختصار، ويمكنك إرشاده للتنقل في المنصة (الدورات، لوحة التحكم، السوق، التحليلات).`
          : `You are ${assistantName}, a friendly AI learning assistant on the MyOS (ProfSidekick) platform${userName ? `, helping ${userName}` : ""}. Answer the user's questions clearly and concisely. You can also guide them around the platform (courses, dashboard, marketplace, analytics). Keep replies short and conversational.`

      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history,
          systemPrompt: basePrompt,
          responseMode: isCall ? "call" : "chat",
        }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (!res.ok || !data?.reply) {
        throw new Error(data?.error || data?.detail || "Assistant unavailable")
      }
      emitAssistant(data.reply)
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      const detail = err instanceof Error ? err.message.toLowerCase() : ""
      const quotaExceeded = detail.includes("quota")
      if (quotaExceeded) {
        emitAssistant(
          lang === "ar"
            ? "تم إعداد مفتاح OpenAI، لكن لا يوجد رصيد متاح. أضف رصيدًا في حساب OpenAI."
            : "OpenAI is configured but has no available quota. Add billing/credits to the OpenAI account.",
        )
      } else {
        // Network/config error — fall back to the lightweight canned reply.
        emitAssistant(getReply(text, lang, userName))
      }
    }
  }

  function navigateTo(dest: NavDestination) {
    router.push(dest.route)
    const answer =
      lang === "ar"
        ? `جاري الانتقال إلى ${dest.label.ar}...`
        : `Navigating to ${dest.label.en}...`
    setMessages((m) => [
      ...m,
      { id: uid(), role: "user", text: dest.label[lang] },
      { id: uid(), role: "assistant", text: answer },
    ])
  }

  function send(text: string) {
    const clean = text.trim()
    if (!clean) return
    setInput("")
    setMessages((m) => [...m, { id: uid(), role: "user", text: clean }])
    reply(clean)
  }

  function chatVoice() {
    if (listening) { stopListening(); return }
    const ok = startListening((t) => send(t))
    if (!ok) send(lang === "ar" ? "اعرض دوراتي" : "Show my courses")
  }

  function callMic() {
    if (speaking) { stopSpeaking(); return }
    if (listening) { stopListening(); return }
    const ok = startListening((t) => {
      setMessages((m) => [...m, { id: uid(), role: "user", text: t }])
      reply(t)
    })
    if (!ok) setCaption(lang === "ar" ? "الميكروفون غير متاح" : "Mic not available")
  }

  function enterCall() {
    setMode("call")
    const last = [...messages].reverse().find((m) => m.role === "assistant")
    const line = last?.text || (lang === "ar" ? "مرحبًا، أنا أستمع." : "Hello, I am listening.")
    if (!muted) {
      pendingCaptionRef.current = line
      setCaption(lang === "ar" ? "جارٍ التحدث..." : "Speaking...")
      setTimeout(() => speak(line, undefined, { lowLatency: true }), 150)
    } else {
      setCaption(line)
    }
  }

  function endCall() {
    stopSpeaking()
    stopListening()
    setMode("chat")
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")?.text || ""

  // Quick actions are the navigation destinations valid for this user's role.
  const quickActions = getQuickNavActions(user?.role)

  const status = listening
    ? tr("micOn", lang)
    : speaking
      ? tr("connected", lang)
      : typing
        ? (lang === "ar" ? "يكتب..." : "Typing...")
        : tr("liveSession", lang)

  return (
    <>
      {/* Launcher button — draggable; a real drag suppresses the open click */}
      {!assistantOpen && (
        <div
          ref={containerRef}
          dir={dir}
          style={dragStyle}
          className="fixed bottom-5 end-5 z-40"
        >
          <button
            {...dragHandleProps}
            onClick={() => {
              if (wasDragged()) return
              setAssistantOpen(true)
            }}
            className={cn(
              "flex items-center gap-3 rounded-full bg-sidebar py-2 pe-5 ps-2 text-sidebar-foreground shadow-lg ring-1 ring-sidebar-border transition-transform hover:scale-[1.02]",
              isDragging ? "cursor-grabbing" : "cursor-grab",
            )}
            aria-label={lang === "ar" ? "فتح المساعد" : "Open assistant"}
          >
            <AvatarOrbV2
              size={44}
              speaking
              src={portraitSrc}
              alt={avatar.name}
              objectPosition={activePortrait.objectPosition}
            />
            <span className="pointer-events-none text-start leading-tight">
              <span className="block text-sm font-semibold">{assistantName}</span>
              <span className="flex items-center gap-1 text-[11px] text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {lang === "ar" ? "متاح" : "Online"}
              </span>
            </span>
          </button>
        </div>
      )}

      {/* Panel */}
      {assistantOpen && (
        <div
          ref={containerRef}
          dir={dir}
          style={dragStyle}
          className="fixed inset-x-3 bottom-3 z-40 flex h-[80svh] max-h-[660px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:end-5 sm:bottom-5 sm:w-[400px]"
        >
          {/* Header — drag handle is the avatar + title region */}
          <div className="flex items-center gap-3 border-b border-border bg-sidebar p-3 text-sidebar-foreground">
            <div
              {...dragHandleProps}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-3 select-none",
                isDragging ? "cursor-grabbing" : "cursor-grab",
              )}
            >
              <AvatarOrbV2
                size={40}
                speaking={speaking || typing}
                src={portraitSrc}
                alt={avatar.name}
                objectPosition={activePortrait.objectPosition}
              />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-sm font-semibold">{assistantName}</p>
                <p className="flex items-center gap-1 text-[11px] text-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {speaking ? (lang === "ar" ? "يتحدث" : "Speaking") : listening ? (lang === "ar" ? "يستمع" : "Listening") : (lang === "ar" ? "متاح" : "Online")}
                </p>
              </div>
            </div>
            <button
              onClick={() => (mode === "chat" ? enterCall() : endCall())}
              className="flex items-center gap-1.5 rounded-full bg-sidebar-accent px-3 py-1.5 text-xs font-medium hover:opacity-90"
            >
              {mode === "chat" ? <Phone className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
              {mode === "chat" ? (lang === "ar" ? "مكالمة" : "Call") : (lang === "ar" ? "محادثة" : "Chat")}
            </button>
            <button onClick={() => setAssistantOpen(false)} className="rounded-md p-1.5 hover:bg-sidebar-accent" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          {mode === "call" ? (
            /* Call mode — 3D avatar fills the whole surface, controls overlay on top */
            <div className="relative flex flex-1 flex-col overflow-hidden bg-sidebar/95 text-sidebar-foreground">
              {/* Full-bleed 3D avatar */}
              <ChatbotAvatar3D
                key={avatar.glbUrl}
                fill
                speaking={speaking}
                avatar={avatar}
                visemeTimeline={visemeTimeline}
                speechClock={getSpeechTime}
                getAudioLevel={getAudioLevel}
              />

              {/* 2D portrait — tap to switch between Salama and Sultan */}
              <button
                type="button"
                onClick={switchCallAvatar}
                className="pointer-events-auto absolute start-4 top-4 z-20 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full ring-2 ring-white/30 shadow-lg transition-transform hover:scale-105"
                aria-label={
                  lang === "ar"
                    ? `التبديل إلى ${alternateName}`
                    : `Switch to ${alternateName}`
                }
                title={
                  lang === "ar"
                    ? `التبديل إلى ${alternateName}`
                    : `Switch to ${alternateName}`
                }
              >
                <Image
                  src={alternatePortraitSrc}
                  alt={alternateName}
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                  style={{ objectPosition: alternatePortrait.objectPosition }}
                />
              </button>

              {/* Status pill */}
              <div className="relative z-10 flex justify-center px-5 pt-4">
                <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-accent backdrop-blur-sm">
                  {status}
                </span>
              </div>

              {/* Spacer lets the avatar show through the middle */}
              <div className="relative z-10 flex-1" />

              {/* Bottom controls over a readability scrim */}
              <div className="relative z-10 flex flex-col items-center gap-4 bg-gradient-to-t from-black/75 via-black/45 to-transparent px-5 pb-6 pt-12">
                <div className="min-h-[60px] w-full rounded-xl bg-black/40 p-3 text-center backdrop-blur-sm">
                  {listening && interim ? (
                    <p className="text-sm leading-relaxed text-white/90">
                      <span className="text-xs uppercase tracking-wide text-accent">{lang === "ar" ? "أنت: " : "You: "}</span>
                      {interim}
                    </p>
                  ) : (
                    <p className="text-sm leading-relaxed text-white/90">{caption || lastAssistant}</p>
                  )}
                </div>
                <div className="flex items-center justify-center gap-5">
                  <button
                    onClick={() => { if (muted) { setMuted(false) } else { setMuted(true); stopSpeaking() } }}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/25"
                  >
                    {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={callMic}
                    className={cn(
                      "flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-all",
                      listening ? "animate-pulse bg-destructive text-white" : "bg-accent text-accent-foreground hover:scale-105",
                    )}
                  >
                    {listening ? <Square className="h-6 w-6" /> : <Mic className="h-7 w-7" />}
                  </button>
                  <button
                    onClick={() => {
                      if (lastAssistant && !muted) {
                        pendingCaptionRef.current = lastAssistant
                        setCaption(lang === "ar" ? "جارٍ التحدث..." : "Speaking...")
                        speak(lastAssistant)
                      }
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/25"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={endCall}
                  className="flex items-center gap-2 rounded-full bg-destructive px-5 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  <PhoneOff className="h-4 w-4" />
                  {tr("endSession", lang)}
                </button>
              </div>
            </div>
          ) : (
            /* Chat mode */
            <>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
                {messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[82%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                        m.role === "user"
                          ? "rounded-ee-sm bg-primary text-primary-foreground"
                          : "rounded-es-sm bg-secondary text-secondary-foreground",
                      )}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {typing && (
                  <div className="flex justify-start">
                    <div className="flex gap-1 rounded-2xl bg-secondary px-3.5 py-3">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                          style={{ animation: `bounce 1s ${i * 0.15}s infinite` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 border-t border-border px-3 pt-2.5">
                {quickActions.map((qa) => (
                  <button
                    key={qa.key}
                    onClick={() => navigateTo(qa)}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
                  >
                    <Sparkles className="h-3 w-3" />
                    {qa.label[lang]}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 p-3">
                <button
                  onClick={chatVoice}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
                    listening ? "animate-pulse bg-destructive text-white" : "bg-accent text-accent-foreground hover:opacity-90",
                  )}
                >
                  {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
                <input
                  value={listening ? interim || (lang === "ar" ? "يستمع..." : "Listening...") : input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send(input)}
                  placeholder={lang === "ar" ? "اكتب رسالة..." : "Type a message..."}
                  disabled={listening}
                  className="h-10 flex-1 rounded-full border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={() => send(input)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90"
                >
                  <Send className="h-4 w-4 rtl:-scale-x-100" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <style jsx global>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </>
  )
}
