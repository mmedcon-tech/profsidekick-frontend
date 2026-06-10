'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
} from '@heygen/streaming-avatar';
import { isHeyGenEnabled, isHeyGenAvatarIdsConfigured } from '@/lib/heygenConfig';
import { Mic, MicOff, Minus, Maximize2 } from 'lucide-react';

import type { SessionAvatarConfig as GlobalSessionAvatarConfig } from '@/types/types';
import SessionAvatarRenderer from '@/components/avatar/SessionAvatarRenderer';

interface SessionAvatarProps {
  isConnected: boolean;
  isConnecting: boolean;
  isUserSpeaking: boolean;
  isAISpeaking: boolean;
  avatarConfig: GlobalSessionAvatarConfig;
  audioElement: HTMLAudioElement | null;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

const HEYGEN_LIVE = isHeyGenEnabled() && isHeyGenAvatarIdsConfigured();

export default function SessionAvatar({
  isConnected,
  isConnecting,
  isUserSpeaking,
  isAISpeaking,
  avatarConfig,
  audioElement,
  videoRef,
}: SessionAvatarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Minimal dragging state
  const [position, setPosition] = useState({ x: 24, y: 24 }); // Fixed distance from bottom right
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const dx = dragStartRef.current.x - e.clientX;
      const dy = dragStartRef.current.y - e.clientY;
      
      setPosition({
        x: Math.max(0, dragStartRef.current.initialX + dx),
        y: Math.max(0, dragStartRef.current.initialY + dy),
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const avatarPortrait = (
    <div className="relative flex flex-col items-center bg-gradient-to-b from-emerald-950 to-gray-950 px-4 pt-5 pb-4 flex-shrink-0 cursor-move" onMouseDown={handleMouseDown}>
      <div className="relative h-48 w-48 overflow-hidden rounded-full ring-4 ring-emerald-600/80 shadow-xl pointer-events-none">
        <SessionAvatarRenderer
          config={avatarConfig}
          audioElement={audioElement}
          isConnected={isConnected}
          isAISpeaking={isAISpeaking}
          isUserSpeaking={isUserSpeaking}
          heygenConnected={isConnected && !isConnecting}
          heygenVideoRef={videoRef}
        />
        {isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  );

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed z-50 flex flex-col items-center gap-1 group shadow-xl transition-all"
        style={{ bottom: position.y, right: position.x }}
      >
        <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-white shadow-xl group-hover:ring-emerald-400 active:scale-95 transition-all bg-gray-800">
          <Image
            src={avatarConfig.imageUrl || '/images/avatar-female.png'}
            alt={avatarConfig.avatarName}
            fill
            className="object-cover object-top"
          />
        </div>
        <div className="bg-white rounded-full px-2.5 py-0.5 shadow-md flex items-center gap-1.5 text-xs font-semibold text-gray-700 mt-1">
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}
          />
          {avatarConfig.avatarName}
        </div>
      </button>
    );
  }

  return (
    <div 
      className="fixed z-50 w-64 rounded-2xl shadow-2xl overflow-hidden border border-emerald-900/40 bg-gray-900"
      style={{ bottom: position.y, right: position.x }}
    >
      <div 
        className="flex items-center justify-between px-4 py-2 bg-emerald-900 border-b border-emerald-800 cursor-move"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isConnected ? 'bg-green-400' : isConnecting ? 'bg-yellow-400 animate-pulse' : 'bg-gray-500'
            }`}
          />
          <span className="text-white font-semibold text-sm truncate select-none">
            {avatarConfig.avatarName}
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 rounded-full hover:bg-emerald-800 text-emerald-100"
        >
          <Minus size={16} />
        </button>
      </div>
      
      {avatarPortrait}

      <div className="px-4 py-3 text-center bg-gray-900 border-t border-gray-800">
        <p className="text-sm font-medium text-gray-200">
          {isAISpeaking ? 'Speaking...' : isUserSpeaking ? 'Listening...' : isConnected ? 'Listening...' : 'Connecting...'}
        </p>
        <div className="mt-3 flex justify-center pb-2">
           <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isUserSpeaking ? 'bg-amber-400 scale-110 shadow-amber-400/50 shadow-lg' : isConnected ? 'bg-gray-700' : 'bg-gray-800'
            }`}>
              <Mic size={20} className={isUserSpeaking ? 'text-gray-900' : 'text-gray-400'} />
           </div>
        </div>
      </div>
    </div>
  );
}
