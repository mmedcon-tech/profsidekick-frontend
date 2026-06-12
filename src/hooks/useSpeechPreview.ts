'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { buildAvatarPreviewGreeting } from '@/lib/avatarGreeting';
import { getAvatarLibraryEntryByName } from '@/lib/avatarLibrary';
import type { SpeechVoiceGender } from '@/lib/openaiSpeech';
import { loadSpeechVoices, pickSpeechVoice } from '@/lib/speechVoice';
import { useAudioAmplitude } from '@/hooks/useAudioAmplitude';

export interface SpeechPreviewState {
  active: boolean;
  loading: boolean;
  amplitude: number;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

function resolveUserFirstName(
  user: { firstName?: string; lastName?: string; username?: string } | null,
): string {
  if (!user) return 'there';
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return full || user.username || 'there';
}

function resolveVoiceGender(avatarName: string, override?: SpeechVoiceGender): SpeechVoiceGender {
  if (override) return override;
  const entry = getAvatarLibraryEntryByName(avatarName);
  if (entry?.gender === 'male' || entry?.gender === 'female') return entry.gender;
  return avatarName === 'Sultan' ? 'male' : 'female';
}

async function fetchNeuralSpeech(
  text: string,
  gender: SpeechVoiceGender,
): Promise<Blob | null> {
  const response = await fetch('/api/speech/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, gender }),
  });

  if (!response.ok) return null;
  return response.blob();
}

function speakWithBrowserTts(
  text: string,
  gender: SpeechVoiceGender,
  voices: SpeechSynthesisVoice[],
  onStart: () => void,
  onWord: () => void,
  onEnd: () => void,
): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickSpeechVoice(gender, voices);
  utterance.rate = 0.94;
  utterance.pitch = 1;
  utterance.volume = 1;
  if (voice) utterance.voice = voice;

  utterance.onstart = onStart;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  utterance.onboundary = (event) => {
    if (event.name === 'word') onWord();
  };

  window.speechSynthesis.speak(utterance);
  return utterance;
}

/** Speaks a personalised greeting via OpenAI TTS (with browser fallback) and drives lip-sync. */
export function useSpeechPreview(
  avatarName: string,
  voiceGender?: SpeechVoiceGender,
): SpeechPreviewState {
  const { user } = useAuth();
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [browserAmplitude, setBrowserAmplitude] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const gender = resolveVoiceGender(avatarName, voiceGender);
  const neuralAmplitude = useAudioAmplitude(audioElement, active && !loading);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
    utteranceRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute('src');
      audio.load();
    }
    revokeObjectUrl();
    setActive(false);
    setLoading(false);
    setBrowserAmplitude(0);
  }, [revokeObjectUrl]);

  const start = useCallback(async () => {
    if (typeof window === 'undefined') return;

    stop();
    const userName = resolveUserFirstName(user);
    const text = buildAvatarPreviewGreeting(userName, avatarName);
    setLoading(true);

    try {
      const blob = await fetchNeuralSpeech(text, gender);
      const audio = audioRef.current;
      if (blob && audio) {
        revokeObjectUrl();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        audio.src = url;

        const handleEnded = (): void => stop();
        audio.onended = handleEnded;
        audio.onerror = handleEnded;

        setLoading(false);
        setActive(true);
        await audio.play();
        return;
      }
    } catch {
      // fall through to browser TTS
    }

    if (!window.speechSynthesis) {
      setLoading(false);
      return;
    }

    const voices = await loadSpeechVoices();
    utteranceRef.current = speakWithBrowserTts(
      text,
      gender,
      voices,
      () => {
        setLoading(false);
        setActive(true);
      },
      () => setBrowserAmplitude(0.35 + Math.random() * 0.3),
      () => stop(),
    );
  }, [avatarName, gender, revokeObjectUrl, stop, user]);

  const toggle = useCallback(() => {
    if (active || loading) stop();
    else void start();
  }, [active, loading, start, stop]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;
    setAudioElement(audio);
    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
      revokeObjectUrl();
    };
  }, [revokeObjectUrl]);

  useEffect(() => {
    if (!active || neuralAmplitude > 0) return;

    let rafId = 0;
    const decay = (): void => {
      setBrowserAmplitude((prev) => Math.max(0, prev * 0.82));
      rafId = window.requestAnimationFrame(decay);
    };
    rafId = window.requestAnimationFrame(decay);

    return () => window.cancelAnimationFrame(rafId);
  }, [active, neuralAmplitude]);

  useEffect(() => () => stop(), [stop]);

  const amplitude =
    neuralAmplitude > 0 ? neuralAmplitude : browserAmplitude;

  return { active, loading, amplitude, start, stop, toggle };
}
