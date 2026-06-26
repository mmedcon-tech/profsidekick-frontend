"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useAppV2 } from "@/lib/v2/context"
import { tr } from "@/lib/v2/i18n"
import { courses, avatars } from "@/lib/v2/data"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Mic, MicOff, Volume2, VolumeX, PhoneOff,
  ChevronLeft, ChevronRight, ChevronDown,
  PanelRightClose, PanelRightOpen, Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Demo data ────────────────────────────────────────────────────────────────

interface TranscriptMsg {
  id: string
  role: "avatar" | "user"
  text: { en: string; ar: string }
  time: string
}

const DEMO_TRANSCRIPT: TranscriptMsg[] = [
  {
    id: "t1", role: "avatar", time: "0:04",
    text: {
      en: "Welcome to this session on AI Governance. Today we'll explore the UAE AI Strategy 2031 and its implications for government operations. Are you ready to begin?",
      ar: "مرحبًا بك في جلسة حوكمة الذكاء الاصطناعي. سنستعرض اليوم استراتيجية الإمارات للذكاء الاصطناعي 2031 وتداعياتها على العمل الحكومي. هل أنت مستعد؟",
    },
  },
  {
    id: "t2", role: "user", time: "0:20",
    text: { en: "Yes, I'm ready.", ar: "نعم، أنا مستعد." },
  },
  {
    id: "t3", role: "avatar", time: "0:22",
    text: {
      en: "Excellent. Let's start with slide 1. The UAE AI Strategy 2031 was launched by His Highness Sheikh Mohammed bin Rashid Al Maktoum. It aims to position the UAE among the world's top AI-ready countries.",
      ar: "ممتاز. لنبدأ بالشريحة الأولى. أُطلقت الاستراتيجية بمبادرة من صاحب السمو الشيخ محمد بن راشد آل مكتوم، وتهدف إلى تصدّر الإمارات لقائمة أكثر دول العالم استعدادًا للذكاء الاصطناعي.",
    },
  },
  {
    id: "t4", role: "user", time: "1:05",
    text: { en: "What are the seven priority sectors?", ar: "ما هي القطاعات السبعة ذات الأولوية؟" },
  },
  {
    id: "t5", role: "avatar", time: "1:08",
    text: {
      en: "Great question. The seven priority sectors are: Education, Healthcare, Transportation, Space, Renewable Energy, Water, and Technology. Each has specific AI adoption targets by 2031.",
      ar: "سؤال ممتاز. القطاعات السبعة هي: التعليم، والرعاية الصحية، والنقل، والفضاء، والطاقة المتجددة، والمياه، والتكنولوجيا. ولكل قطاع أهداف محددة لتبني الذكاء الاصطناعي بحلول 2031.",
    },
  },
]

const DEMO_SLIDES = [
  {
    num: 1,
    title: { en: "UAE AI Strategy 2031 Overview", ar: "نظرة عامة على استراتيجية الإمارات للذكاء الاصطناعي 2031" },
    points: [
      { en: "Launched by HH Sheikh Mohammed bin Rashid", ar: "أطلقها صاحب السمو الشيخ محمد بن راشد" },
      { en: "Position UAE in top AI-ready nations", ar: "تصدّر الإمارات لقائمة الدول الأكثر استعدادًا للذكاء الاصطناعي" },
      { en: "7 priority sectors identified", ar: "تحديد 7 قطاعات ذات أولوية" },
      { en: "Target: $182B economic impact by 2031", ar: "الهدف: تأثير اقتصادي بقيمة 182 مليار دولار بحلول 2031" },
    ],
    cited: false,
  },
  {
    num: 2,
    title: { en: "Key Priority Sectors", ar: "القطاعات ذات الأولوية الرئيسية" },
    points: [
      { en: "Education — personalised AI tutoring", ar: "التعليم — التعليم الشخصي بالذكاء الاصطناعي" },
      { en: "Healthcare — early diagnosis systems", ar: "الرعاية الصحية — أنظمة التشخيص المبكر" },
      { en: "Transportation — autonomous vehicles", ar: "النقل — المركبات ذاتية القيادة" },
      { en: "Renewable Energy — smart grid optimisation", ar: "الطاقة المتجددة — تحسين الشبكات الذكية" },
      { en: "Space — satellite data processing", ar: "الفضاء — معالجة بيانات الأقمار الاصطناعية" },
    ],
    cited: false,
  },
  {
    num: 3,
    title: { en: "AI Governance Principles", ar: "مبادئ حوكمة الذكاء الاصطناعي" },
    points: [
      { en: "Transparency — explainable AI decisions", ar: "الشفافية — قرارات الذكاء الاصطناعي القابلة للتفسير" },
      { en: "Accountability — clear responsibility chains", ar: "المساءلة — سلاسل مسؤولية واضحة" },
      { en: "Privacy — data minimisation by design", ar: "الخصوصية — تقليص البيانات بالتصميم" },
      { en: "Safety — risk assessment frameworks", ar: "السلامة — أطر تقييم المخاطر" },
      { en: "Fairness — bias detection and mitigation", ar: "العدالة — اكتشاف التحيز والتخفيف منه" },
    ],
    cited: false,
  },
  {
    num: 4,
    title: { en: "Implementation Roadmap", ar: "خارطة طريق التنفيذ" },
    points: [
      { en: "Phase 1 (2024–2026): Foundation & Pilots", ar: "المرحلة 1 (2024–2026): التأسيس والتجارب" },
      { en: "Phase 2 (2026–2028): Scale & Integrate", ar: "المرحلة 2 (2026–2028): التوسع والتكامل" },
      { en: "Phase 3 (2028–2031): Full Adoption", ar: "المرحلة 3 (2028–2031): التبني الكامل" },
    ],
    cited: false,
  },
]

// ─── Session Runtime ───────────────────────────────────────────────────────────

export function SessionRuntime({
  sessionId,
  courseId,
  onEnd,
}: {
  sessionId: string
  courseId: string
  onEnd: () => void
}) {
  const { lang, dir } = useAppV2()
  const [micOn, setMicOn] = useState(true)
  const [soundOn, setSoundOn] = useState(true)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [citedSlide, setCitedSlide] = useState<number | null>(null)
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null)
  const [variantMenuOpen, setVariantMenuOpen] = useState(false)
  const [transcriptOpen, setTranscriptOpen] = useState(true)
  const [transcript, setTranscript] = useState<TranscriptMsg[]>([])
  const [elapsed, setElapsed] = useState(0)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const course = courses.find((c) => c.id === courseId)
  const session = course?.sessions.find((s) => s.id === sessionId)
  const avatar = avatars.find((a) => course?.avatarIds.includes(a.id))
  const activeVariant = avatar?.variants.find((v) => v.id === activeVariantId) ?? avatar?.variants[0]

  // Transcript stream
  useEffect(() => {
    if (!connected) return
    let idx = 0
    const timer = setInterval(() => {
      if (idx < DEMO_TRANSCRIPT.length) {
        setTranscript((prev) => [...prev, DEMO_TRANSCRIPT[idx]])
        // Simulate slide cite on t3
        if (DEMO_TRANSCRIPT[idx].id === "t3") setCitedSlide(0)
        if (DEMO_TRANSCRIPT[idx].id === "t5") setCitedSlide(1)
        idx++
      } else clearInterval(timer)
    }, 2400)
    return () => clearInterval(timer)
  }, [connected])

  // Elapsed timer
  useEffect(() => {
    if (connected) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [connected])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [transcript])

  // When avatar cites a slide, auto-navigate to it
  useEffect(() => {
    if (citedSlide !== null) setCurrentSlide(citedSlide)
  }, [citedSlide])

  function handleConnect() {
    setConnecting(true)
    setTimeout(() => { setConnecting(false); setConnected(true) }, 1800)
  }

  function handleEndSession() {
    setConnected(false)
    setTranscript([])
    setElapsed(0)
    onEnd()
  }

  const fmtElapsed = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`
  const avatarImgSrc = activeVariant?.model3dId.includes("male") ? "/images/avatar-male.png" : "/images/avatar-female.png"

  if (!course || !session) return null

  return (
    <div dir={dir} className="flex h-[calc(100svh-3.5rem)] flex-col overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{session.title[lang]}</p>
          <p className="truncate text-xs text-muted-foreground">{course.name[lang]}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {connected && (
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{fmtElapsed}</span>
          )}
          <span className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            connected
              ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
              : connecting
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
                : "bg-muted text-muted-foreground"
          )}>
            <span className={cn(
              "h-1.5 w-1.5 rounded-full",
              connected ? "animate-pulse bg-green-500" : connecting ? "animate-pulse bg-yellow-400" : "bg-muted-foreground"
            )} />
            {connected ? tr("connected", lang) : connecting ? tr("connecting", lang) : (lang === "ar" ? "غير متصل" : "Offline")}
          </span>
          <button
            onClick={() => setTranscriptOpen((o) => !o)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Toggle transcript"
          >
            {transcriptOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Main 3-column area ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Avatar + controls ── */}
        <div className="flex w-60 shrink-0 flex-col border-e border-border">
          {/* Avatar visual */}
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-5">
            <div className="relative" style={{ width: 140, height: 140 }}>
              {connected && (
                <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" style={{ animationDuration: "2s" }} />
              )}
              <div className={cn(
                "relative h-full w-full overflow-hidden rounded-full",
                connected
                  ? "ring-2 ring-accent ring-offset-4 ring-offset-sidebar"
                  : "ring-2 ring-sidebar-border"
              )}>
                <Image src={avatarImgSrc} alt={activeVariant?.name[lang] ?? "Avatar"} fill sizes="140px" className="object-cover" />
              </div>
              {/* Sound bars */}
              {connected && (
                <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-end gap-0.5">
                  {[3, 6, 10, 6, 3].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 rounded-full bg-accent"
                      style={{ height: h, animation: `eq 0.7s ${i * 0.1}s ease-in-out infinite` }}
                    />
                  ))}
                </span>
              )}
            </div>

            <div className="text-center">
              <p className="text-sm font-semibold text-sidebar">
                {activeVariant?.name[lang] ?? avatar?.name[lang]}
              </p>
              <p className="text-xs text-sidebar">
                {activeVariant?.language.toUpperCase()} · {activeVariant?.openaiVoice}
              </p>
            </div>

            {/* Variant switcher */}
            {avatar?.allowSubscriberVariantSwitch && (avatar?.variants.length ?? 0) > 1 && (
              <div className="relative w-full">
                <button
                  onClick={() => setVariantMenuOpen((o) => !o)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-sidebar-border bg-sidebar-accent px-3 py-2 text-xs text-sidebar-foreground hover:bg-sidebar-accent/80"
                >
                  <Users className="h-3.5 w-3.5" />
                  {tr("switchVariant", lang)}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", variantMenuOpen && "rotate-180")} />
                </button>
                {variantMenuOpen && (
                  <div className="absolute bottom-full left-0 z-10 mb-1 w-full rounded-lg border border-sidebar-border bg-sidebar py-1 shadow-lg">
                    {avatar.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => { setActiveVariantId(v.id); setVariantMenuOpen(false) }}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-xs text-sidebar-foreground hover:bg-sidebar-accent",
                          activeVariant?.id === v.id && "font-semibold text-accent"
                        )}
                      >
                        {v.name[lang]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Controls bar */}
          <div className="border-t border-sidebar-border p-3 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => setMicOn((m) => !m)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-lg py-2.5 text-[11px] font-medium transition-colors",
                  micOn ? "bg-sidebar-accent text-sidebar-foreground" : "bg-destructive/15 text-destructive"
                )}
              >
                {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                {micOn ? tr("micOn", lang) : tr("micOff", lang)}
              </button>
              <button
                onClick={() => setSoundOn((s) => !s)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-lg py-2.5 text-[11px] font-medium transition-colors",
                  soundOn ? "bg-sidebar-accent text-sidebar-foreground" : "bg-destructive/15 text-destructive"
                )}
              >
                {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                {soundOn ? tr("soundOn", lang) : tr("soundOff", lang)}
              </button>
            </div>

            {connected ? (
              <button
                onClick={handleEndSession}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-destructive/10 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/20"
              >
                <PhoneOff className="h-4 w-4" />
                {tr("endSession", lang)}
              </button>
            ) : (
              <Button className="w-full text-xs" onClick={handleConnect} disabled={connecting}>
                {connecting ? tr("connecting", lang) : tr("startSession", lang)}
              </Button>
            )}
          </div>
        </div>

        {/* ── Center: Slides ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Slide content */}
          <div className="flex flex-1 items-center justify-center overflow-auto bg-muted/20 p-6">
            <div
              className={cn(
                "w-full max-w-2xl rounded-xl border bg-card shadow-sm transition-all",
                citedSlide === currentSlide ? "border-accent ring-2 ring-accent/30" : "border-border"
              )}
            >
              {/* Slide header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-2.5">
                <p className="text-xs text-muted-foreground">
                  {tr("slides", lang)} {currentSlide + 1} / {DEMO_SLIDES.length}
                </p>
                {citedSlide === currentSlide && (
                  <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {lang === "ar" ? "مستشهد به" : "Cited"}
                  </span>
                )}
              </div>
              <div className="p-8">
                <h2 className="text-xl font-bold text-foreground">{DEMO_SLIDES[currentSlide].title[lang]}</h2>
                <ul className="mt-6 space-y-3">
                  {DEMO_SLIDES[currentSlide].points.map((p, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {p[lang]}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Slide nav */}
          <div className="flex shrink-0 items-center justify-between border-t border-border bg-card px-4 py-2.5">
            <Button
              variant="outline" size="sm"
              onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))}
              disabled={currentSlide === 0}
              className="gap-1.5 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {lang === "ar" ? "السابق" : "Prev"}
            </Button>
            {/* Dot indicators */}
            <div className="flex items-center gap-1.5">
              {DEMO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={cn(
                    "rounded-full transition-all",
                    i === currentSlide ? "h-2 w-5 bg-primary" : "h-2 w-2 bg-border hover:bg-muted-foreground"
                  )}
                />
              ))}
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => setCurrentSlide((s) => Math.min(DEMO_SLIDES.length - 1, s + 1))}
              disabled={currentSlide === DEMO_SLIDES.length - 1}
              className="gap-1.5 text-xs"
            >
              {lang === "ar" ? "التالي" : "Next"}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Right: Transcript panel ── */}
        {transcriptOpen && (
          <div className="flex w-72 shrink-0 flex-col border-s border-border bg-card">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {tr("transcript", lang)}
              </p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {transcript.length} {lang === "ar" ? "رسالة" : "msgs"}
              </span>
            </div>
            <ScrollArea className="flex-1 p-3">
              {transcript.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-xs text-muted-foreground">
                    {lang === "ar" ? "سيظهر النص هنا بعد بدء الجلسة." : "Transcript will appear here once the session starts."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transcript.map((msg) => (
                    <div key={msg.id} className={cn("flex gap-2", msg.role === "user" && "flex-row-reverse")}>
                      <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full">
                        {msg.role === "avatar" ? (
                          <Image src="/images/avatar-female.png" alt="" width={24} height={24} className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-primary/20 text-[9px] font-bold text-primary">
                            {lang === "ar" ? "أنا" : "Me"}
                          </div>
                        )}
                      </div>
                      <div className="max-w-[80%] space-y-0.5">
                        <span className={cn(
                          "text-[10px] text-muted-foreground",
                          msg.role === "user" && "block text-end"
                        )}>
                          {msg.time}
                        </span>
                        <div className={cn(
                          "rounded-xl px-3 py-2 text-xs leading-relaxed",
                          msg.role === "avatar"
                            ? "rounded-ss-none bg-secondary text-secondary-foreground"
                            : "rounded-se-none bg-primary text-primary-foreground"
                        )}>
                          {msg.text[lang]}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes eq {
          0%, 100% { transform: scaleY(0.6); }
          50% { transform: scaleY(1.4); }
        }
      `}</style>
    </div>
  )
}
