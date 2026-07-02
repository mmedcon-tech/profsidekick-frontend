'use client';

import React, { useEffect, useRef, useState } from 'react';
import SessionAvatarRenderer from '@/components/avatar/SessionAvatarRenderer';
import { getAvatarModeLabel, isHeyGenEnabled } from '@/lib/heygenConfig';
import type { AvatarRenderType, SessionAvatarConfig } from '@/types/types';

const DEMO_CONFIGS: Record<AvatarRenderType, SessionAvatarConfig> = {
  static: {
    renderType: 'static',
    avatarName: 'Dr. Morgan',
    imageUrl: '/images/avatar-female.png',
  },
  talkingheads: {
    renderType: 'talkingheads',
    avatarName: 'Coach Rivera',
    imageUrl: '/images/avatar-male.png',
  },
  heygen: {
    renderType: 'heygen',
    avatarName: 'Prof. Chen',
    heygenAvatarId: 'demo_avatar_id',
    imageUrl: '/images/avatar-female.png',
  },
  glb: {
    renderType: 'glb',
    avatarName: 'Salama',
    glbLibraryId: 'avatar-1',
    imageUrl: '/images/avatar-female.png',
  },
  '3d': {
    renderType: '3d',
    avatarName: 'Avatar 3D',
    modelUrl: '/avatars/avatar-1.glb',
    imageUrl: '/images/avatar-female.png',
  },
};

/**
 * Visual prototype for the three subscriber avatar modes (v0-style review page).
 * Lets the team preview static / talkingheads / heygen before backend wiring.
 */
export default function AvatarModePrototype(): React.ReactElement {
  const [mode, setMode] = useState<AvatarRenderType>('glb');
  const [glbLibraryId, setGlbLibraryId] = useState<'avatar-1' | 'avatar-2'>('avatar-1');
  const [widgetState, setWidgetState] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const config: SessionAvatarConfig =
    mode === 'glb'
      ? {
          ...DEMO_CONFIGS.glb,
          glbLibraryId,
          avatarName: glbLibraryId === 'avatar-1' ? 'Salama' : 'Sultan',
          imageUrl:
            glbLibraryId === 'avatar-1'
              ? '/images/avatar-female.png'
              : '/images/avatar-male.png',
        }
      : DEMO_CONFIGS[mode];
  const isSpeaking = widgetState === 'speaking';
  const isListening = widgetState === 'listening';

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Subscriber avatar preview
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Prototype the three publisher-configured modes before full backend integration.
          HeyGen is {isHeyGenEnabled() ? 'enabled' : 'paused'}.
        </p>
      </header>

      <div className="flex flex-wrap justify-center gap-2">
        {(['static', 'talkingheads', 'heygen', 'glb', '3d'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setMode(type)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              mode === type
                ? 'bg-primary dark:bg-primary/90 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200'
            }`}
          >
            {getAvatarModeLabel(type)}
          </button>
        ))}
      </div>

      {mode === 'glb' && (
        <div className="flex flex-wrap justify-center gap-2">
          {(['avatar-1', 'avatar-2'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setGlbLibraryId(id)}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                glbLibraryId === id
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              {id === 'avatar-1' ? 'Salama (avatar-1)' : 'Sultan (avatar-2)'}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {(['idle', 'listening', 'speaking'] as const).map((state) => (
          <button
            key={state}
            type="button"
            onClick={() => setWidgetState(state)}
            className={`rounded-lg border px-3 py-1.5 text-xs capitalize ${
              widgetState === state
                ? 'border-primary/50 dark:border-primary/50 bg-primary/5 dark:bg-primary/20 text-primary/95 dark:text-primary/30'
                : 'border-gray-200 text-gray-600'
            }`}
          >
            {state}
          </button>
        ))}
      </div>

      <div className="mx-auto w-full max-w-xs overflow-hidden rounded-2xl border border-gray-200 shadow-xl dark:border-gray-700">
        <div className="relative bg-gray-900" style={{ aspectRatio: '9/16' }}>
          <SessionAvatarRenderer
            config={config}
            audioElement={audioRef.current}
            isConnected
            isAISpeaking={isSpeaking}
            isUserSpeaking={isListening}
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
        <p className="font-semibold">Mode notes</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
          <li>
            <strong>Static</strong> — free; photo + audio-driven animation (live now).
          </li>
          <li>
            <strong>TalkingHeads</strong> — animated provider; uses enhanced static fallback until credentials arrive.
          </li>
          <li>
            <strong>HeyGen</strong> — realistic video (~$1/min); paused until{' '}
            <code className="text-[10px]">HEYGEN_API_KEY</code> +{' '}
            <code className="text-[10px]">NEXT_PUBLIC_HEYGEN_ENABLED=true</code>.
          </li>
          <li>
            <strong>GLB</strong> — realistic portrait persona; lip-sync only while the AI is speaking in a live session.
          </li>
        </ul>
      </div>
    </div>
  );
}
