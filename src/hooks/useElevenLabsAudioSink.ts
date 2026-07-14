'use client';

import { useCallback, useEffect, useRef } from 'react';

export interface ElevenLabsAudioSink {
  /** The `<audio>` element ElevenLabs clauses play through — pass this as the
   * avatar renderer's `audioElement` prop so `useAudioAmplitude` drives lip
   * sync off real playback, exactly like the OpenAI WebRTC path does. */
  audioElement: HTMLAudioElement | null;
  /** Enqueue a completed clause/sentence for synthesis + sequential playback. */
  push: (text: string) => void;
  /** Immediately stop playback and discard any queued-but-unplayed clauses
   * (barge-in). Safe to call even if nothing is playing. */
  stop: () => void;
}

interface UseElevenLabsAudioSinkOptions {
  /** Resolved ElevenLabs voice id for the active avatar; clauses are queued
   * but not sent for synthesis until this is available. */
  voiceId?: string | null;
  onSpeakingChange?: (speaking: boolean) => void;
}

/**
 * Owns a dedicated `<audio>` element fed by a FIFO queue of text clauses,
 * each synthesized via the existing `/api/tts/elevenlabs` REST route and
 * played back-to-back. This is the "mouth" half of the brain/mouth split:
 * OpenAI Realtime (text-only mode) supplies the clauses, this sink turns
 * them into audio the avatar's existing amplitude-based lip sync can use.
 */
export function useElevenLabsAudioSink({
  voiceId,
  onSpeakingChange,
}: UseElevenLabsAudioSinkOptions): ElevenLabsAudioSink {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<string[]>([]);
  const processingRef = useRef(false);
  const currentObjectUrlRef = useRef<string | null>(null);
  // Bumped on every stop(); in-flight fetch/play promises check this before
  // acting so a barge-in can't be "un-stopped" by a synthesis call that was
  // already in flight when the user interrupted.
  const generationRef = useRef(0);
  const voiceIdRef = useRef(voiceId);
  voiceIdRef.current = voiceId;
  const onSpeakingChangeRef = useRef(onSpeakingChange);
  onSpeakingChangeRef.current = onSpeakingChange;

  if (!audioRef.current && typeof window !== 'undefined') {
    audioRef.current = new Audio();
  }

  const releaseCurrentObjectUrl = () => {
    if (currentObjectUrlRef.current) {
      URL.revokeObjectURL(currentObjectUrlRef.current);
      currentObjectUrlRef.current = null;
    }
  };

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    const generation = generationRef.current;
    const audio = audioRef.current;

    try {
      while (queueRef.current.length > 0 && generation === generationRef.current) {
        const text = queueRef.current.shift()!;
        if (!text.trim() || !audio) continue;

        let audioBuffer: ArrayBuffer;
        try {
          const res = await fetch('/api/tts/elevenlabs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voiceId: voiceIdRef.current ?? undefined }),
          });
          if (generation !== generationRef.current) return;
          if (!res.ok) continue;
          audioBuffer = await res.arrayBuffer();
        } catch {
          continue;
        }
        if (generation !== generationRef.current) return;

        releaseCurrentObjectUrl();
        const objectUrl = URL.createObjectURL(
          new Blob([audioBuffer], { type: 'audio/mpeg' }),
        );
        currentObjectUrlRef.current = objectUrl;
        audio.src = objectUrl;

        onSpeakingChangeRef.current?.(true);
        try {
          await audio.play();
          await new Promise<void>((resolve) => {
            const onEnded = () => {
              audio.removeEventListener('ended', onEnded);
              audio.removeEventListener('error', onEnded);
              resolve();
            };
            audio.addEventListener('ended', onEnded);
            audio.addEventListener('error', onEnded);
          });
        } catch {
          // playback failed/was interrupted (e.g. paused by stop()) — move on
        }
        if (generation !== generationRef.current) return;
      }
    } finally {
      processingRef.current = false;
      if (generation === generationRef.current) {
        onSpeakingChangeRef.current?.(false);
      }
    }
  }, []);

  const push = useCallback((text: string) => {
    if (!text.trim()) return;
    queueRef.current.push(text);
    void processQueue();
  }, [processQueue]);

  const stop = useCallback(() => {
    generationRef.current += 1;
    queueRef.current = [];
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    releaseCurrentObjectUrl();
    processingRef.current = false;
    onSpeakingChangeRef.current?.(false);
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { audioElement: audioRef.current, push, stop };
}
