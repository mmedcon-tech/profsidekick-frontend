'use client';

import React, { useEffect, useState } from 'react';
import type { AvatarWidgetState } from '@/types/types';

type AvatarVisualVariant = 'static' | 'talkingheads';

interface StaticAvatarWidgetProps {
  imageUrl?: string;
  avatarName: string;
  widgetState: AvatarWidgetState;
  amplitude: number;
  size?: number;
  variant?: AvatarVisualVariant;
}

export default function StaticAvatarWidget({
  imageUrl,
  avatarName,
  widgetState,
  amplitude,
  size = 180,
  variant = 'static',
}: StaticAvatarWidgetProps): React.ReactElement {
  const [blink, setBlink] = useState(false);
  const initial = avatarName.trim().charAt(0).toUpperCase() || 'A';

  useEffect(() => {
    if (widgetState !== 'idle') {
      setBlink(false);
      return;
    }
    let timeoutId = 0;
    const scheduleBlink = (): void => {
      const delay = 3000 + Math.random() * 3000;
      timeoutId = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => {
          setBlink(false);
          scheduleBlink();
        }, 150);
      }, delay);
    };
    scheduleBlink();
    return () => window.clearTimeout(timeoutId);
  }, [widgetState]);

  const jawOpen =
    widgetState === 'speaking' ? 0.15 + amplitude * 0.45 : 0;
  const ringOpacity =
    widgetState === 'speaking'
      ? 0.35 + amplitude * 0.45
      : widgetState === 'listening'
        ? 0.2
        : 0.12;
  const ringScale =
    widgetState === 'speaking'
      ? 1 + amplitude * 0.12
      : widgetState === 'listening'
        ? 1.04
        : 1;

  const ringColor =
    variant === 'talkingheads' ? 'border-violet-400' : 'border-blue-400';
  const faceGradient =
    variant === 'talkingheads'
      ? 'from-violet-700 to-indigo-900'
      : 'from-slate-600 to-slate-800';

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      data-state={widgetState}
      data-variant={variant}
    >
      <div
        className={`absolute inset-0 rounded-full border-2 ${ringColor} transition-transform duration-150 ${
          widgetState === 'listening' ? 'animate-pulse' : ''
        } ${widgetState === 'speaking' ? 'animate-ping' : ''}`}
        style={{ opacity: ringOpacity, transform: `scale(${ringScale})` }}
        aria-hidden
      />
      <div
        className={`relative overflow-hidden rounded-full bg-gradient-to-br ${faceGradient} shadow-lg`}
        style={{
          width: size,
          height: size,
          clipPath: 'circle(50% at 50% 50%)',
          animation:
            widgetState === 'idle'
              ? 'breathe 3s ease-in-out infinite'
              : undefined,
        }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={avatarName}
            className="h-full w-full object-cover object-top"
            style={{
              transform: blink ? 'scaleY(0.12)' : 'scaleY(1)',
              transformOrigin: 'center 28%',
              transition: 'transform 120ms ease',
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-white">
            {initial}
          </div>
        )}
        {widgetState === 'speaking' && (
          <div
            className="pointer-events-none absolute bottom-[18%] left-1/2 h-3 w-10 -translate-x-1/2 rounded-full bg-black/25"
            style={{
              transform: `translateX(-50%) scaleY(${0.4 + jawOpen})`,
              transformOrigin: 'center top',
            }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
