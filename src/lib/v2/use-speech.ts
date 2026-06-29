"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { playElevenLabsSpeech } from "@/lib/playElevenLabsAudio"
import { buildEstimatedTimeline } from "@/lib/visemeTimeline"
import type { VisemeTimeline } from "@/lib/visemeTypes"
import { resolveVoiceProfile, type VoiceProfile } from "@/lib/voiceProfiles"

/** Fallback speaking rate (chars/sec) used until onboundary events calibrate it. */
const FALLBACK_CHARS_PER_SECOND = 13

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
 *
 * `voice` may be a full {@link VoiceProfile} (derived from the avatar's
 * configured voice id) or a bare gender for convenience. The profile drives
 * voice selection and pitch so each avatar sounds distinct — not always the
 * default female voice.
 */
export function useSpeech(lang: "en" | "ar", voice: VoiceProfile | "male" | "female") {
  const profile: VoiceProfile =
    typeof voice === "string" ? resolveVoiceProfile(undefined, voice) : voice
  const gender = profile.gender
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState("")
  const [supported, setSupported] = useState({ tts: false, stt: false })
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  // Viseme timeline for the current utterance. The avatar samples it through a
  // shared clock so the mouth shapes line up with the actual audio.
  const [visemeTimeline, setVisemeTimeline] = useState<VisemeTimeline | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalRef = useRef<string>("")
  const onFinalRef = useRef<((t: string) => void) | null>(null)
  const stopAudioRef = useRef<(() => void) | null>(null)

  // Clock sources: ElevenLabs uses the audio element's real currentTime; browser
  // TTS estimates progress from onboundary word events (which fire as the engine
  // actually speaks) so the viseme clock stays locked to the spoken words.
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const ttsStartRef = useRef(0)
  const ttsBoundaryCharRef = useRef(0)
  const ttsBoundaryTimeRef = useRef(0)
  const ttsCharsPerSecRef = useRef(0)
  const ttsTextLenRef = useRef(0)
  const ttsDurationRef = useRef(0)

  const resetTtsClock = useCallback(() => {
    ttsStartRef.current = 0
    ttsBoundaryCharRef.current = 0
    ttsBoundaryTimeRef.current = 0
    ttsCharsPerSecRef.current = 0
  }, [])

  /** Elapsed seconds within the current utterance, mapped onto the timeline. */
  const getSpeechTime = useCallback((): number => {
    const audio = audioElRef.current
    if (audio) return audio.currentTime
    if (ttsStartRef.current <= 0) return 0

    const duration = ttsDurationRef.current || 0
    const len = Math.max(1, ttsTextLenRef.current)

    let charPos: number
    if (ttsBoundaryTimeRef.current > 0) {
      const since = (performance.now() - ttsBoundaryTimeRef.current) / 1000
      const cps = ttsCharsPerSecRef.current || FALLBACK_CHARS_PER_SECOND
      charPos = ttsBoundaryCharRef.current + cps * since
    } else {
      const elapsed = (performance.now() - ttsStartRef.current) / 1000
      charPos = (elapsed * FALLBACK_CHARS_PER_SECOND)
    }
    const fraction = Math.min(1, charPos / len)
    return fraction * duration
  }, [])

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

  // Browser TTS fallback (used when ElevenLabs is unavailable). Drives an
  // estimated viseme timeline whose clock self-calibrates from onboundary events.
  const speakWithBrowserTts = useCallback(
    (text: string, onDone?: () => void) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        // No TTS at all: simulate a speaking duration so the UI still reacts.
        setSpeaking(true)
        const ms = Math.min(6000, 1200 + text.length * 35)
        setTimeout(() => {
          setSpeaking(false)
          onDone?.()
        }, ms)
        return
      }

      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      const v = pickVoice()
      if (v) u.voice = v
      u.lang = v?.lang || (lang === "ar" ? "ar-SA" : "en-US")
      u.rate = profile.rate
      u.pitch = profile.pitch

      const estDuration = Math.max(2, (text.length / FALLBACK_CHARS_PER_SECOND) * (1 / profile.rate))
      ttsTextLenRef.current = text.length
      ttsDurationRef.current = estDuration

      u.onboundary = (event: SpeechSynthesisEvent) => {
        const now = performance.now()
        const charIndex = event.charIndex ?? 0
        if (ttsBoundaryTimeRef.current > 0 && charIndex > ttsBoundaryCharRef.current) {
          const deltaChars = charIndex - ttsBoundaryCharRef.current
          const deltaSeconds = (now - ttsBoundaryTimeRef.current) / 1000
          if (deltaSeconds > 0.01) {
            const instant = deltaChars / deltaSeconds
            ttsCharsPerSecRef.current = ttsCharsPerSecRef.current
              ? ttsCharsPerSecRef.current * 0.6 + instant * 0.4
              : instant
          }
        }
        ttsBoundaryCharRef.current = charIndex
        ttsBoundaryTimeRef.current = now
      }

      u.onstart = () => {
        ttsStartRef.current = performance.now()
        ttsBoundaryCharRef.current = 0
        ttsBoundaryTimeRef.current = 0
        ttsCharsPerSecRef.current = 0
        setSpeaking(true)
        setVisemeTimeline(buildEstimatedTimeline(text, estDuration))
      }
      const finish = () => {
        resetTtsClock()
        setVisemeTimeline(null)
        setSpeaking(false)
        onDone?.()
      }
      u.onend = finish
      u.onerror = finish
      window.speechSynthesis.speak(u)
    },
    [lang, pickVoice, profile.pitch, profile.rate, resetTtsClock],
  )

  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      stopAudioRef.current?.()
      stopAudioRef.current = null
      audioElRef.current = null
      resetTtsClock()

      // Prefer ElevenLabs for both languages: it returns per-character timing,
      // which is the only way to make the mouth shapes match the actual words.
      // The audio element's currentTime then drives the viseme clock exactly.
      playElevenLabsSpeech({
        text,
        gender,
        onSpeakingChange: (isSpeaking) => {
          setSpeaking(isSpeaking)
          if (!isSpeaking) {
            audioElRef.current = null
            setVisemeTimeline(null)
            onDone?.()
          }
        },
      })
        .then((result) => {
          stopAudioRef.current = result.stop
          audioElRef.current = result.audio
          setVisemeTimeline(result.timeline)
        })
        .catch(() => {
          // ElevenLabs unavailable (no key / quota / network) → browser TTS.
          speakWithBrowserTts(text, onDone)
        })
    },
    [gender, resetTtsClock, speakWithBrowserTts],
  )

  const stopSpeaking = useCallback(() => {
    stopAudioRef.current?.()
    stopAudioRef.current = null
    audioElRef.current = null
    resetTtsClock()
    setVisemeTimeline(null)
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
    setSpeaking(false)
  }, [resetTtsClock])

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
    visemeTimeline,
    getSpeechTime,
  }
}
