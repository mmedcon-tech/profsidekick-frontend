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
import { ChatbotAvatar3D } from "@/components/layout/ChatbotAvatar3D"
import { getDefaultChatbotAvatar } from "@/lib/avatarLibrary"

const defaultChatbotAvatar = getDefaultChatbotAvatar()

// Lightweight static orb for launcher/header — same Emirati male persona as the 3D call avatar
function AvatarOrbV2({ size = 44, speaking = false }: { size?: number; speaking?: boolean }) {
  return (
    <div
      className="relative shrink-0 rounded-full overflow-hidden"
      style={{ width: size, height: size }}
    >
      <Image
        src={defaultChatbotAvatar.thumbnailPath}
        alt={defaultChatbotAvatar.name}
        width={size}
        height={size}
        className="h-full w-full object-cover"
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

export function FloatingAssistant() {
  const { user } = useAuth()
  const router = useRouter()
  const lang = "en" as "en" | "ar"
  const dir = "ltr"
  
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [mode, setMode] = useState<Mode>("chat")
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState("")
  const [typing, setTyping] = useState(false)
  const [muted, setMuted] = useState(false)
  const [caption, setCaption] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const mutedRef = useRef(muted)
  mutedRef.current = muted

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

  const { speaking, listening, interim, speak, stopSpeaking, startListening, stopListening } =
    useSpeech(lang, "female")

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

  function reply(text: string) {
    setTyping(true)
    setTimeout(() => {
      let answer = getReply(text, lang, userName)
      
      const q = text.toLowerCase()
      const has = (...w: string[]) => w.some((x) => q.includes(x))
      
      // Execute actions
      if (has("course", "courses", "دوراتي", "الدورات")) {
        router.push("/subscriber/dashboard") // Fallback to subscriber dashboard
        answer = lang === "ar" ? "جاري الانتقال إلى دوراتك..." : "Navigating to your courses..."
      } else if (has("nav", "navigate", "dashboard", "التنقل", "لوحة")) {
        const role = user?.role === "student" ? "subscriber" : user?.role || "subscriber"
        router.push(`/${role}/dashboard`)
        answer = lang === "ar" ? "جاري الانتقال إلى لوحة التحكم..." : "Navigating to your dashboard..."
      } else if (has("session", "بدء جلسة")) {
        // Mock navigation to a session
        answer = lang === "ar" ? "يرجى اختيار الدورة أولاً لبدء الجلسة." : "Please select a course first to start a session."
      }

      setMessages((m) => [...m, { id: uid(), role: "assistant", text: answer }])
      setTyping(false)
      if (mode === "call" && !mutedRef.current) {
        setCaption(answer)
        speak(answer)
      }
    }, 800)
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
    setCaption(line)
    if (!muted) setTimeout(() => speak(line), 400)
  }

  function endCall() {
    stopSpeaking()
    stopListening()
    setMode("chat")
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")?.text || ""

  const quickActions = [
    { key: "nav", label: { en: "Navigate", ar: "التنقل" } },
    { key: "courses", label: { en: "My Courses", ar: "دوراتي" } },
    { key: "session", label: { en: "Start Session", ar: "بدء جلسة" } },
    { key: "help", label: { en: "Help", ar: "مساعدة" } },
  ]

  const status = listening
    ? tr("micOn", lang)
    : speaking
      ? tr("connected", lang)
      : typing
        ? (lang === "ar" ? "يكتب..." : "Typing...")
        : tr("liveSession", lang)

  return (
    <>
      {/* Launcher button */}
      {!assistantOpen && (
        <button
          onClick={() => setAssistantOpen(true)}
          dir={dir}
          className="fixed bottom-5 end-5 z-40 flex items-center gap-3 rounded-full bg-sidebar py-2 pe-5 ps-2 text-sidebar-foreground shadow-lg ring-1 ring-sidebar-border transition-transform hover:scale-[1.02]"
          aria-label={lang === "ar" ? "فتح المساعد" : "Open assistant"}
        >
          <AvatarOrbV2 size={44} speaking />
          <span className="text-start leading-tight">
            <span className="block text-sm font-semibold">{assistantName}</span>
            <span className="flex items-center gap-1 text-[11px] text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {lang === "ar" ? "متاح" : "Online"}
            </span>
          </span>
        </button>
      )}

      {/* Panel */}
      {assistantOpen && (
        <div
          dir={dir}
          className="fixed inset-x-3 bottom-3 z-40 flex h-[80svh] max-h-[660px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:end-5 sm:bottom-5 sm:w-[400px]"
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border bg-sidebar p-3 text-sidebar-foreground">
            <AvatarOrbV2 size={40} speaking={speaking || typing} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-sm font-semibold">{assistantName}</p>
              <p className="flex items-center gap-1 text-[11px] text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {speaking ? (lang === "ar" ? "يتحدث" : "Speaking") : listening ? (lang === "ar" ? "يستمع" : "Listening") : (lang === "ar" ? "متاح" : "Online")}
              </p>
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
            /* Call mode */
            <div className="flex flex-1 flex-col items-center justify-between bg-sidebar/95 px-5 py-6 text-sidebar-foreground">
              <div className="flex w-full flex-1 flex-col items-center justify-center gap-5">
                <ChatbotAvatar3D size={120} speaking={speaking} />
                <p className="text-sm font-medium text-accent">{status}</p>
                <div className="min-h-[88px] w-full rounded-xl bg-sidebar-accent/60 p-3 text-center">
                  {listening && interim ? (
                    <p className="text-sm leading-relaxed text-sidebar-foreground/90">
                      <span className="text-xs uppercase tracking-wide text-accent">{lang === "ar" ? "أنت: " : "You: "}</span>
                      {interim}
                    </p>
                  ) : (
                    <p className="text-sm leading-relaxed text-sidebar-foreground/90">{caption || lastAssistant}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center gap-5">
                <button
                  onClick={() => { if (muted) { setMuted(false) } else { setMuted(true); stopSpeaking() } }}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground hover:opacity-90"
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
                  onClick={() => { if (lastAssistant && !muted) { setCaption(lastAssistant); speak(lastAssistant) } }}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground hover:opacity-90"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
              </div>
              <button
                onClick={endCall}
                className="mt-4 flex items-center gap-2 rounded-full bg-destructive px-5 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                <PhoneOff className="h-4 w-4" />
                {tr("endSession", lang)}
              </button>
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
                    onClick={() => send(qa.label[lang])}
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
