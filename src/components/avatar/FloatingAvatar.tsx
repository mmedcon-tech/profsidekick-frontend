'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
} from '@heygen/streaming-avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';
import { Bot, Mic, MicOff, Minus, X } from 'lucide-react';

const PERSONAS = [
  {
    id: 'female' as const,
    label: 'Female',
    name: process.env.NEXT_PUBLIC_HEYGEN_AVATAR_NAME_FEMALE ?? 'Salama',
    avatarId: process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID_FEMALE ?? '',
    voiceId: process.env.NEXT_PUBLIC_HEYGEN_VOICE_ID_FEMALE ?? '',
  },
  {
    id: 'male' as const,
    label: 'Male',
    name: process.env.NEXT_PUBLIC_HEYGEN_AVATAR_NAME_MALE ?? 'Sultan',
    avatarId: process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID_MALE ?? '',
    voiceId: process.env.NEXT_PUBLIC_HEYGEN_VOICE_ID_MALE ?? '',
  },
];

type PersonaId = 'female' | 'male';

export default function FloatingAvatar() {
  const { user } = useAuth();
  const { courses } = useCourses();

  const [isExpanded, setIsExpanded] = useState(false);
  const [activePersonaId, setActivePersonaId] = useState<PersonaId>('male');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const avatarRef = useRef<StreamingAvatar | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasGreeted = useRef(false);

  const activePersona = PERSONAS.find((p) => p.id === activePersonaId) ?? PERSONAS[1];

  const stopAvatar = useCallback(async () => {
    if (avatarRef.current) {
      try {
        await avatarRef.current.stopAvatar();
      } catch (_) {
        // ignore cleanup errors
      }
      avatarRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsMicActive(false);
  }, []);

  const startAvatar = useCallback(
    async (persona: (typeof PERSONAS)[0]) => {
      setIsConnecting(true);
      setConnectionError(false);

      try {
        const res = await fetch('/api/heygen/token', { method: 'POST' });
        if (!res.ok) throw new Error('token fetch failed');
        const { token } = await res.json();

        const avatar = new StreamingAvatar({ token });
        avatarRef.current = avatar;

        avatar.on(StreamingEvents.STREAM_READY, async () => {
          // mediaStream is available on the avatar instance after STREAM_READY
          const stream = avatar.mediaStream;
          if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setIsConnected(true);
          setIsConnecting(false);

          if (!hasGreeted.current) {
            hasGreeted.current = true;
            const name = user?.firstName || user?.username || '';
            const count = courses.length;
            const greeting = name
              ? `Welcome back, ${name}! You have ${count} enrolled course${count !== 1 ? 's' : ''}. How can I help you today?`
              : `Hello! I'm your AI training assistant. How can I help you today?`;
            await avatar.speak({ text: greeting, taskType: TaskType.REPEAT });
          }
        });

        avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
          setIsConnected(false);
          setIsConnecting(false);
        });

        await avatar.createStartAvatar({
          avatarName: persona.avatarId,
          quality: AvatarQuality.Medium,
          ...(persona.voiceId ? { voice: { voiceId: persona.voiceId } } : {}),
        });
      } catch (err) {
        console.error('HeyGen connection error:', err);
        setIsConnecting(false);
        setConnectionError(true);
        avatarRef.current = null;
      }
    },
    [user, courses],
  );

  const handleExpand = useCallback(async () => {
    setIsExpanded(true);
    if (!isConnected && !isConnecting) {
      await startAvatar(activePersona);
    }
  }, [isConnected, isConnecting, startAvatar, activePersona]);

  const handleMinimize = useCallback(() => {
    setIsExpanded(false);
    // Keep the HeyGen session alive while minimized
  }, []);

  const handleClose = useCallback(async () => {
    setIsExpanded(false);
    hasGreeted.current = false;
    await stopAvatar();
  }, [stopAvatar]);

  const handlePersonaSwitch = useCallback(
    async (personaId: PersonaId) => {
      if (personaId === activePersonaId) return;
      setActivePersonaId(personaId);
      const next = PERSONAS.find((p) => p.id === personaId)!;
      hasGreeted.current = false;
      await stopAvatar();
      await startAvatar(next);
    },
    [activePersonaId, stopAvatar, startAvatar],
  );

  const toggleMic = useCallback(async () => {
    if (!avatarRef.current || !isConnected) return;
    try {
      if (isMicActive) {
        await avatarRef.current.closeVoiceChat();
        setIsMicActive(false);
      } else {
        await avatarRef.current.startVoiceChat({ isInputAudioMuted: false });
        setIsMicActive(true);
      }
    } catch (err) {
      console.error('Voice chat toggle error:', err);
    }
  }, [isConnected, isMicActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAvatar();
    };
  }, [stopAvatar]);

  // ── Collapsed state ──────────────────────────────────────────────────
  if (!isExpanded) {
    return (
      <button
        onClick={handleExpand}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-lg flex items-center justify-center text-white transition-all duration-150"
        title={`Talk to ${activePersona.name}`}
      >
        <Bot size={24} />
      </button>
    );
  }

  // ── Expanded panel ───────────────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl shadow-2xl overflow-hidden border border-gray-700 bg-gray-900">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isConnected
                ? 'bg-green-400'
                : isConnecting
                ? 'bg-yellow-400 animate-pulse'
                : 'bg-gray-500'
            }`}
          />
          <span className="text-white font-semibold text-sm truncate">{activePersona.name}</span>
          <span className="text-gray-400 text-xs flex-shrink-0">· AI Assistant</span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
          <button
            onClick={handleMinimize}
            className="p-1.5 rounded-full hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
            title="Minimise"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Persona toggle */}
      <div className="flex gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            onClick={() => handlePersonaSwitch(p.id)}
            disabled={isConnecting}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all disabled:opacity-50 ${
              activePersonaId === p.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-200'
            }`}
          >
            {p.name} · {p.label}
          </button>
        ))}
      </div>

      {/* Video area */}
      <div className="relative bg-gray-950" style={{ aspectRatio: '16/9' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Overlay shown while not yet streaming */}
        {!isConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
            {connectionError ? (
              <>
                <div className="w-14 h-14 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mb-2">
                  <Bot size={24} className="text-gray-500" />
                </div>
                <span className="text-gray-500 text-xs text-center px-4">
                  Could not connect to assistant
                </span>
                <button
                  onClick={() => startAvatar(activePersona)}
                  className="mt-3 text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Retry
                </button>
              </>
            ) : isConnecting ? (
              <>
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                <span className="text-gray-400 text-xs">
                  Connecting to {activePersona.name}…
                </span>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mb-2">
                  <Bot size={24} className="text-gray-500" />
                </div>
                <span className="text-gray-500 text-xs">{activePersona.name}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Talk control */}
      <div className="flex items-center justify-center py-3 bg-gray-800 border-t border-gray-700">
        <button
          onClick={toggleMic}
          disabled={!isConnected}
          aria-busy={isMicActive}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            isMicActive
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isMicActive ? <MicOff size={14} /> : <Mic size={14} />}
          {isMicActive ? 'Mute' : 'Talk to assistant'}
        </button>
      </div>
    </div>
  );
}
