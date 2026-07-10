'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getAvatarLibraryEntryByName,
  getAvatarVoiceProfile,
} from '@/lib/avatarLibrary';
import { pickSpeechVoice, loadSpeechVoices } from '@/lib/speechVoice';
import { playAvatarSpeech } from '@/lib/playAvatarSpeech';
import { useAudioAmplitude } from '@/hooks/useAudioAmplitude';
import { useSimulatedAmplitude } from '@/hooks/useSimulatedAmplitude';
import { useVisemePlayback } from '@/hooks/useVisemePlayback';
import { buildEstimatedTimeline } from '@/lib/visemeTimeline';
import type { VisemeMorphWeights, VisemeTimeline } from '@/lib/visemeTypes';
import type { AvatarLibraryLipSyncHints } from '@/lib/avatarLibrary';

export const SPEECH_PREVIEW_TEXT =
  "Hello! I'm excited to guide you through the material and help you master every concept. Let's get started!";

/** Fallback speaking rate (characters/second) used until onboundary calibrates it. */
const DEFAULT_CHARS_PER_SECOND = 12.5;

export interface SpeechPreviewState {
  active: boolean;
  loading: boolean;
  amplitude: number;
  visemeRef: React.RefObject<VisemeMorphWeights | null>;
  lipSyncHints?: AvatarLibraryLipSyncHints;
  toggle: () => void;
}

export function useSpeechPreview(avatarName: string): SpeechPreviewState {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [visemeTimeline, setVisemeTimeline] = useState<VisemeTimeline | null>(null);

  const stopAudioRef = useRef<(() => void) | null>(null);
  const speechClockStartRef = useRef(0);
  // Browser-TTS sync state, updated from SpeechSynthesis `onboundary` events.
  const boundaryCharRef = useRef(0);
  const boundaryTimeRef = useRef(0);
  const charsPerSecRef = useRef(0);
  const textLenRef = useRef(0);
  const timelineDurationRef = useRef(0);
  const entry = getAvatarLibraryEntryByName(avatarName);
  const lipSyncHints = entry?.lipSync;

  const resetSpeechClock = useCallback(() => {
    speechClockStartRef.current = 0;
    boundaryCharRef.current = 0;
    boundaryTimeRef.current = 0;
    charsPerSecRef.current = 0;
  }, []);

  const playbackClock = useCallback((): number => {
    // ElevenLabs path: real audio element is the source of truth.
    if (previewAudio) return previewAudio.currentTime;

    const now = performance.now();
    // Browser TTS: extrapolate the spoken character position from the last word
    // boundary using a self-calibrating rate, then map it onto the viseme timeline.
    // This keeps the mouth locked to the actual voice instead of a guessed duration.
    if (boundaryTimeRef.current > 0 && textLenRef.current > 0) {
      const elapsed = (now - boundaryTimeRef.current) / 1000;
      const cps = charsPerSecRef.current || DEFAULT_CHARS_PER_SECOND;
      const charPos = boundaryCharRef.current + elapsed * cps;
      const fraction = Math.min(1, charPos / textLenRef.current);
      return fraction * timelineDurationRef.current;
    }

    if (speechClockStartRef.current > 0 && textLenRef.current > 0) {
      const elapsed = (now - speechClockStartRef.current) / 1000;
      const charPos = elapsed * DEFAULT_CHARS_PER_SECOND;
      const fraction = Math.min(1, charPos / textLenRef.current);
      return fraction * timelineDurationRef.current;
    }
    return 0;
  }, [previewAudio]);

  const realAmplitude = useAudioAmplitude(previewAudio, active);
  const simulatedAmplitude = useSimulatedAmplitude(active && !previewAudio && !visemeTimeline);
  const visemeRef = useVisemePlayback(playbackClock, visemeTimeline, active, lipSyncHints);

  const stop = useCallback(() => {
    stopAudioRef.current?.();
    stopAudioRef.current = null;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPreviewAudio(null);
    setVisemeTimeline(null);
    resetSpeechClock();
    setActive(false);
    setLoading(false);
  }, [resetSpeechClock]);

  const toggle = useCallback(async () => {
    if (active || loading) {
      stop();
      return;
    }

    setLoading(true);
    const gender = entry?.gender === 'male' ? 'male' : 'female';
    const voiceProfile = entry ? getAvatarVoiceProfile(entry) : 'adult';
    const prefersElevenLabs = Boolean(entry);

    if (prefersElevenLabs) {
      try {
        const { stop: stopPlayback, audio, timeline } = await playAvatarSpeech({
          text: SPEECH_PREVIEW_TEXT,
          gender,
          voiceProfile,
          onSpeakingChange: (speaking) => {
            setActive(speaking);
            if (!speaking) {
              setPreviewAudio(null);
              setVisemeTimeline(null);
              setLoading(false);
            }
          },
        });
        stopAudioRef.current = stopPlayback;
        timelineDurationRef.current = timeline?.duration ?? 0;
        setPreviewAudio(audio);
        setVisemeTimeline(timeline);
        setLoading(false);
        setActive(true);
        return;
      } catch {
        // Fall back to browser speech below.
      }
    }

    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const voices = await loadSpeechVoices();
    const voice = pickSpeechVoice(gender, voices, voiceProfile);

    const utterance = new SpeechSynthesisUtterance(SPEECH_PREVIEW_TEXT);
    if (voice) utterance.voice = voice;
    utterance.rate = voiceProfile === 'kids' ? 1.04 : 0.97;
    utterance.pitch =
      voiceProfile === 'kids'
        ? gender === 'male'
          ? 1.28
          : 1.38
        : gender === 'male'
          ? 0.92
          : 1.08;

    // onboundary fires per word as the engine actually speaks — use it to keep
    // the viseme clock locked to the real voice rate.
    textLenRef.current = SPEECH_PREVIEW_TEXT.length;
    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      const now = performance.now();
      const charIndex = event.charIndex ?? 0;
      if (boundaryTimeRef.current > 0 && charIndex > boundaryCharRef.current) {
        const deltaChars = charIndex - boundaryCharRef.current;
        const deltaSeconds = (now - boundaryTimeRef.current) / 1000;
        if (deltaSeconds > 0.01) {
          const instantRate = deltaChars / deltaSeconds;
          charsPerSecRef.current = charsPerSecRef.current
            ? charsPerSecRef.current * 0.6 + instantRate * 0.4
            : instantRate;
        }
      }
      boundaryCharRef.current = charIndex;
      boundaryTimeRef.current = now;
    };

    utterance.onstart = () => {
      speechClockStartRef.current = performance.now();
      boundaryCharRef.current = 0;
      boundaryTimeRef.current = 0;
      charsPerSecRef.current = 0;
      setLoading(false);
      setActive(true);
      // Nominal timeline length; with onboundary the clock is fraction-based so the
      // exact value is not critical, but a realistic estimate keeps the no-boundary
      // fallback well-paced.
      const estimatedDuration = Math.max(
        3,
        (SPEECH_PREVIEW_TEXT.length / DEFAULT_CHARS_PER_SECOND) *
          (voiceProfile === 'kids' ? 0.96 : 1.03),
      );
      timelineDurationRef.current = estimatedDuration;
      setVisemeTimeline(buildEstimatedTimeline(SPEECH_PREVIEW_TEXT, estimatedDuration));
    };

    const finish = (): void => {
      resetSpeechClock();
      setActive(false);
      setLoading(false);
      setVisemeTimeline(null);
    };
    utterance.onend = finish;
    utterance.onerror = finish;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setLoading(true);
  }, [active, loading, avatarName, entry, stop, resetSpeechClock]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      stopAudioRef.current?.();
    };
  }, []);

  return {
    active,
    loading,
    amplitude: active ? (previewAudio ? realAmplitude : simulatedAmplitude) : 0,
    visemeRef,
    lipSyncHints,
    toggle,
  };
}
