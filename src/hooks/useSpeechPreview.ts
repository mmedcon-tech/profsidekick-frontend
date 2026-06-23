'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAvatarLibraryEntryByName } from '@/lib/avatarLibrary';
import { pickSpeechVoice, loadSpeechVoices } from '@/lib/speechVoice';

const PREVIEW_TEXT =
  "Hello! I'm excited to guide you through the material and help you master every concept. Let's get started!";

export interface SpeechPreviewState {
  active: boolean;
  loading: boolean;
  amplitude: number;
  toggle: () => void;
}

export function useSpeechPreview(avatarName: string): SpeechPreviewState {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amplitude, setAmplitude] = useState(0);

  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const stopAmplitude = useCallback(() => {
    window.cancelAnimationFrame(rafRef.current);
    setAmplitude(0);
  }, []);

  const startAmplitude = useCallback(() => {
    startTimeRef.current = performance.now();
    const tick = (): void => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      // Blend two sine waves to feel more natural than a single oscillation
      const value =
        0.45 +
        0.3 * Math.sin(elapsed * 6.5) +
        0.15 * Math.sin(elapsed * 13.1 + 1.2);
      setAmplitude(Math.max(0, Math.min(1, value)));
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopAmplitude();
    setActive(false);
    setLoading(false);
  }, [stopAmplitude]);

  const toggle = useCallback(async () => {
    if (active || loading) {
      stop();
      return;
    }

    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    setLoading(true);
    const voices = await loadSpeechVoices();
    const entry = getAvatarLibraryEntryByName(avatarName);
    const gender = entry?.gender === 'male' ? 'male' : 'female';
    const voice = pickSpeechVoice(gender, voices);

    const utterance = new SpeechSynthesisUtterance(PREVIEW_TEXT);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.97;
    utterance.pitch = gender === 'male' ? 0.92 : 1.08;

    utterance.onstart = () => {
      setLoading(false);
      setActive(true);
      startAmplitude();
    };

    const finish = (): void => {
      stopAmplitude();
      setActive(false);
      setLoading(false);
    };
    utterance.onend = finish;
    utterance.onerror = finish;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setLoading(true);
  }, [active, loading, avatarName, stop, startAmplitude, stopAmplitude]);

  // Cancel on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { active, loading, amplitude, toggle };
}
