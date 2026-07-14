'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TtsProvider } from '@/types/avatar';

export const VOICE_PREVIEW_TEXT =
  "Hello! This is a preview of how I'll sound during your teaching sessions.";

export interface VoicePreview {
  /** The voice id currently playing, or null. */
  playingId: string | null;
  /** The voice id currently being fetched/synthesized, or null. */
  loadingId: string | null;
  error: string | null;
  /** Toggle preview playback for a given provider/voice — a second call for
   * the same voice stops it (play/pause behavior). */
  play: (provider: TtsProvider, voiceId: string) => void;
  stop: () => void;
}

/** Previews a publisher's chosen voice before they save it — reuses the
 * existing `/api/speech/preview` (OpenAI) and `/api/tts/elevenlabs` BFF
 * routes with an explicit voice id, so no new backend surface is needed. */
export function useVoicePreview(): VoicePreview {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const generationRef = useRef(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    generationRef.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPlayingId(null);
    setLoadingId(null);
  }, []);

  const play = useCallback(
    (provider: TtsProvider, voiceId: string) => {
      if (playingId === voiceId || loadingId === voiceId) {
        stop();
        return;
      }

      stop();
      setError(null);
      setLoadingId(voiceId);
      const generation = generationRef.current;

      const endpoint = provider === 'elevenlabs' ? '/api/tts/elevenlabs' : '/api/speech/preview';
      const body =
        provider === 'elevenlabs'
          ? { text: VOICE_PREVIEW_TEXT, voiceId }
          : { text: VOICE_PREVIEW_TEXT, voice: voiceId };

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then(async (res) => {
          if (generation !== generationRef.current) return;
          if (!res.ok) throw new Error(`Preview failed (${res.status})`);
          const buffer = await res.arrayBuffer();
          if (generation !== generationRef.current) return;

          const objectUrl = URL.createObjectURL(new Blob([buffer], { type: 'audio/mpeg' }));
          objectUrlRef.current = objectUrl;
          const audio = new Audio(objectUrl);
          audioRef.current = audio;
          audio.onended = () => {
            if (generation === generationRef.current) stop();
          };
          audio.onerror = () => {
            if (generation === generationRef.current) {
              setError('Could not play preview audio');
              stop();
            }
          };
          await audio.play();
          if (generation !== generationRef.current) return;
          setLoadingId(null);
          setPlayingId(voiceId);
        })
        .catch(() => {
          if (generation === generationRef.current) {
            setError('Could not load voice preview');
            stop();
          }
        });
    },
    [playingId, loadingId, stop],
  );

  useEffect(() => stop, [stop]);

  return { playingId, loadingId, error, play, stop };
}
