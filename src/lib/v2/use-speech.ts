"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { playElevenLabsSpeech } from "@/lib/playElevenLabsAudio"

// Minimal typings for the Web Speech API (not in TS lib DOM by default)
type SpeechRecognitionResultLike = {
  0: { transcript: string }
  isFinal: boolean
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number
  results: { length: number; [i: number]: SpeechRecognitionResultLike }
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: ((e: Event) => void) | null
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

/**
 * Real browser speech: text-to-speech (the avatar talks) +
 * speech-to-text (the avatar listens).
 */
export function useSpeech(lang: "en" | "ar", gender: "male" | "female") {
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState("")
  const [supported, setSupported] = useState({ tts: false, stt: false })
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalRef = useRef<string>("")
  const onFinalRef = useRef<((t: string) => void) | null>(null)
  const stopAudioRef = useRef<(() => void) | null>(null)

  // detect support + load voices
  useEffect(() => {
    if (typeof window === "undefined") return
    const hasTTS = "speechSynthesis" in window
    const hasSTT = !!getRecognitionCtor()
    setSupported({ tts: hasTTS, stt: hasSTT })

    if (hasTTS) {
      const load = () => setVoices(window.speechSynthesis.getVoices())
      load()
      window.speechSynthesis.onvoiceschanged = load
    }
    return () => {
      if (hasTTS) window.speechSynthesis.cancel()
    }
  }, [])

  const pickVoice = useCallback((): SpeechSynthesisVoice | undefined => {
    if (!voices.length) return undefined
    const wantAr = lang === "ar"
    const langMatches = voices.filter((v) =>
      wantAr ? v.lang.toLowerCase().startsWith("ar") : v.lang.toLowerCase().startsWith("en"),
    )
    const pool = langMatches.length ? langMatches : voices
    // heuristically prefer a voice matching the chosen gender
    const femaleHints = ["female", "woman", "samantha", "victoria", "zira", "salma", "hala", "google us english"]
    const maleHints = ["male", "man", "david", "daniel", "george", "fred", "naayf", "tarik"]
    const hints = gender === "female" ? femaleHints : maleHints
    const matched = pool.find((v) => hints.some((h) => v.name.toLowerCase().includes(h)))
    return matched || pool[0]
  }, [voices, lang, gender])

  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      stopAudioRef.current?.()
      stopAudioRef.current = null

      if (lang === "ar") {
        void playElevenLabsSpeech({
          text,
          gender,
          onSpeakingChange: (isSpeaking) => {
            setSpeaking(isSpeaking)
            if (!isSpeaking) {
              onDone?.()
            }
          },
        })
          .then((stop) => {
            stopAudioRef.current = stop
          })
          .catch(() => {
            setSpeaking(false)
            onDone?.()
          })
        return
      }

      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        // graceful fallback: simulate speaking duration
        setSpeaking(true)
        const ms = Math.min(6000, 1200 + text.length * 35)
        const t = setTimeout(() => {
          setSpeaking(false)
          onDone?.()
        }, ms)
        return () => clearTimeout(t)
      }
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      const v = pickVoice()
      if (v) u.voice = v
      u.lang = lang === "ar" ? v?.lang || "ar-SA" : v?.lang || "en-US"
      u.rate = lang === "ar" ? 0.95 : 1
      u.pitch = gender === "female" ? 1.08 : 0.92
      u.onstart = () => setSpeaking(true)
      u.onend = () => {
        setSpeaking(false)
        onDone?.()
      }
      u.onerror = () => {
        setSpeaking(false)
        onDone?.()
      }
      window.speechSynthesis.speak(u)
    },
    [lang, gender, pickVoice],
  )

  const stopSpeaking = useCallback(() => {
    stopAudioRef.current?.()
    stopAudioRef.current = null
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
    setSpeaking(false)
  }, [])

  const startListening = useCallback(
    (onFinal: (text: string) => void) => {
      const Ctor = getRecognitionCtor()
      if (!Ctor) {
        // no STT support — caller should handle via fallback
        return false
      }
      stopSpeaking()
      finalRef.current = ""
      onFinalRef.current = onFinal
      const rec = new Ctor()
      rec.lang = lang === "ar" ? "ar-SA" : "en-US"
      rec.continuous = false
      rec.interimResults = true
      rec.onresult = (e: SpeechRecognitionEventLike) => {
        let txt = ""
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i]
          txt += res[0].transcript
          if (res.isFinal) finalRef.current += res[0].transcript
        }
        setInterim(txt)
      }
      rec.onerror = () => {
        setListening(false)
      }
      rec.onend = () => {
        setListening(false)
        setInterim("")
        const result = finalRef.current.trim()
        if (result && onFinalRef.current) onFinalRef.current(result)
      }
      recognitionRef.current = rec
      try {
        rec.start()
        setListening(true)
        return true
      } catch {
        setListening(false)
        return false
      }
    },
    [lang, stopSpeaking],
  )

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return {
    speaking,
    listening,
    interim,
    supported,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
  }
}
