'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import type { AvatarWidgetState } from '@/types/types';

interface PortraitAvatarStageProps {
  imageUrl: string;
  avatarName: string;
  widgetState?: AvatarWidgetState;
  amplitude?: number;
  className?: string;
  showStatusRing?: boolean;
  size?: 'default' | 'large';
}

export default function PortraitAvatarStage({
  imageUrl,
  avatarName,
  widgetState = 'idle',
  amplitude = 0,
  className = '',
  showStatusRing = true,
  size = 'large',
}: PortraitAvatarStageProps): React.ReactElement {
  const [blink, setBlink] = useState(false);
  const isSpeaking = widgetState === 'speaking';
  const isListening = widgetState === 'listening';
  const jawOpen = isSpeaking ? 0.12 + amplitude * 0.38 : 0;
  const frameClass =
    size === 'large'
      ? 'relative aspect-[3/4] w-full min-h-[340px] max-w-xl'
      : 'relative aspect-[3/4] w-full min-h-[280px] max-w-sm';

  useEffect(() => {
    if (widgetState !== 'idle') {
      setBlink(false);
      return;
    }
    let timeoutId = 0;
    const scheduleBlink = (): void => {
      const delay = 3200 + Math.random() * 2800;
      timeoutId = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => {
          setBlink(false);
          scheduleBlink();
        }, 140);
      }, delay);
    };
    scheduleBlink();
    return () => window.clearTimeout(timeoutId);
  }, [widgetState]);

  const ringOpacity = isSpeaking
    ? 0.4 + amplitude * 0.35
    : isListening
      ? 0.22
      : 0;

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#133221] via-[#0f281c] to-[#070d0a] px-4 pb-20 pt-16 ${className}`}
      data-state={widgetState}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_15%,rgba(255,255,255,0.08),transparent_50%)]" />

      <div
        className={frameClass}
        style={{
          animation: widgetState === 'idle' ? 'breathe 4s ease-in-out infinite' : undefined,
        }}
      >
        {showStatusRing && (isSpeaking || isListening) && (
          <div
            className={`pointer-events-none absolute -inset-3 rounded-3xl border-2 ${
              isSpeaking ? 'border-emerald-400/70' : 'border-sky-400/50'
            }`}
            style={{ opacity: ringOpacity }}
            aria-hidden
          />
        )}

        <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-2xl bg-[#0d1812] shadow-2xl ring-1 ring-white/10">
          <Image
            src={imageUrl}
            alt={avatarName}
            fill
            unoptimized
            className="object-contain object-center p-1"
            sizes="(max-width: 768px) 100vw, 560px"
            priority
            style={{
              transform: blink ? 'scaleY(0.96)' : 'scaleY(1)',
              transformOrigin: 'center 22%',
              transition: 'transform 120ms ease',
            }}
          />

          {isSpeaking && (
            <div
              className="pointer-events-none absolute left-1/2 h-4 w-14 -translate-x-1/2 rounded-full bg-black/20 backdrop-blur-[1px]"
              style={{
                bottom: '28%',
                transform: `translateX(-50%) scaleY(${0.35 + jawOpen})`,
                transformOrigin: 'center top',
                opacity: 0.35 + amplitude * 0.45,
              }}
              aria-hidden
            />
          )}
        </div>
      </div>
    </div>
  );
}
