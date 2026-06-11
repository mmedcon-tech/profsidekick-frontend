'use client';

import { useState, useRef, useEffect } from 'react';
import { isHeyGenEnabled, isHeyGenAvatarIdsConfigured } from '@/lib/heygenConfig';
import { Mic, MicOff, Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';

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
  isDocked?: boolean;
  onDockToggle?: () => void;
  onAvatarModeChange?: (mode: 'static' | 'talkingheads' | 'heygen') => void;
  isMicMuted: boolean;
  toggleMicrophone: () => void;
  isAudioEnabled: boolean;
  toggleAudio: () => void;
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
  isDocked = true,
  onDockToggle,
  onAvatarModeChange,
  isMicMuted,
  toggleMicrophone,
  isAudioEnabled,
  toggleAudio,
}: SessionAvatarProps) {
  // Minimal dragging state
  const [position, setPosition] = useState({ x: 24, y: 24 }); // Fixed distance from bottom right
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDocked) return;
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
      if (!isDragging || isDocked) return;
      
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
  }, [isDragging, isDocked]);

  const avatarPortrait = (
    <div 
      className={`relative flex flex-col items-center bg-gray-900 px-4 pt-5 pb-4 flex-shrink-0 ${isDocked ? '' : 'cursor-move'}`} 
      onMouseDown={handleMouseDown}
    >
      <div className="relative h-48 w-48 overflow-hidden rounded-xl shadow-xl pointer-events-none">
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

  const containerClasses = isDocked 
    ? "flex flex-col h-full w-full bg-gray-900 border-l border-emerald-900/40" 
    : "fixed z-50 w-64 rounded-2xl shadow-2xl overflow-hidden border border-emerald-900/40 bg-gray-900";

  return (
    <div 
      className={containerClasses}
      style={isDocked ? undefined : { bottom: position.y, right: position.x }}
    >
      <div 
        className={`flex items-center justify-between px-4 py-2 bg-emerald-900 border-b border-emerald-800 ${isDocked ? '' : 'cursor-move'}`}
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
        {onDockToggle && (
          <button
            onClick={onDockToggle}
            className="p-1 rounded-md hover:bg-emerald-800 text-emerald-100 transition-colors"
            title={isDocked ? "Detach Avatar" : "Dock Avatar"}
          >
            {isDocked ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
        )}
      </div>
      
      {/* Mode Toggle Selection inside Avatar Panel */}
      {onAvatarModeChange && (
        <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex justify-center">
          <select
            value={avatarConfig.renderType}
            onChange={(e) => onAvatarModeChange(e.target.value as any)}
            className="bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded px-2 py-1 text-xs outline-none cursor-pointer w-full"
          >
            <option value="static">Static Photo</option>
            <option value="talkingheads">Animated</option>
            {isHeyGenEnabled() && <option value="heygen">Realistic (HeyGen)</option>}
          </select>
        </div>
      )}

      <div className={isDocked ? "flex-1 flex flex-col justify-center" : ""}>
        {avatarPortrait}
      </div>

      <div className="px-4 py-3 text-center bg-gray-900 border-t border-gray-800">
        <p className="text-sm font-medium text-gray-200">
          {isAISpeaking ? 'Speaking...' : isUserSpeaking ? 'Listening...' : isConnected ? 'Listening...' : 'Connecting...'}
        </p>
        <div className="mt-3 flex justify-center pb-2">
           <button 
             onClick={toggleMicrophone}
             className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isMicMuted 
                  ? 'bg-red-500/50 hover:bg-red-500' 
                  : isUserSpeaking ? 'bg-amber-400 scale-110 shadow-amber-400/50 shadow-lg' : isConnected ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-800'
              }`}
              title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
           >
             {isMicMuted ? <MicOff size={20} className="text-gray-300" /> : <Mic size={20} className={isUserSpeaking ? 'text-gray-900' : 'text-gray-400'} />}
           </button>
           <button
             onClick={toggleAudio}
             className={`ml-3 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                !isAudioEnabled ? 'bg-red-500/50 hover:bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
             }`}
             title={isAudioEnabled ? "Mute Output Audio" : "Unmute Output Audio"}
           >
             {isAudioEnabled ? <Volume2 size={20} className="text-gray-400" /> : <VolumeX size={20} className="text-gray-300" />}
           </button>
        </div>
      </div>
    </div>
  );
}
