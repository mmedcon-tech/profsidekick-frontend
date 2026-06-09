'use client';

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import Image from 'next/image';
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
} from '@heygen/streaming-avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';
import { Bot, Mic, MicOff, Minus, X, Send } from 'lucide-react';

const PERSONAS = [
  {
    id: 'female' as const,
    label: 'Female',
    name: process.env.NEXT_PUBLIC_HEYGEN_AVATAR_NAME_FEMALE ?? 'Salama',
    avatarId: process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID_FEMALE ?? '',
    voiceId: process.env.NEXT_PUBLIC_HEYGEN_VOICE_ID_FEMALE ?? '',
    img: '/images/avatar-female.png',
  },
  {
    id: 'male' as const,
    label: 'Male',
    name: process.env.NEXT_PUBLIC_HEYGEN_AVATAR_NAME_MALE ?? 'Sultan',
    avatarId: process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID_MALE ?? '',
    voiceId: process.env.NEXT_PUBLIC_HEYGEN_VOICE_ID_MALE ?? '',
    img: '/images/avatar-male.png',
  },
];

const HEYGEN_CONFIGURED =
  !!(process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID_FEMALE || process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID_MALE);

type PersonaId = 'female' | 'male';
type ChatMessage = { role: 'user' | 'assistant'; text: string };

export default function FloatingAvatar() {
  const { user } = useAuth();
  const { courses } = useCourses();

  const [isExpanded, setIsExpanded] = useState(false);
  const [activePersonaId, setActivePersonaId] = useState<PersonaId>('female');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  // Text chat state (fallback when HeyGen is not configured)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const avatarRef = useRef<StreamingAvatar | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasGreeted = useRef(false);

  const activePersona = PERSONAS.find((p) => p.id === activePersonaId) ?? PERSONAS[0];

  // Online status: HeyGen connected, or always available for text chat
  const isOnline = HEYGEN_CONFIGURED ? isConnected : true;

  // ── Scroll chat to bottom on new messages ────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Text chat send ───────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || isSending) return;

    setChatInput('');
    const userMsg: ChatMessage = { role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      const context = `The user's name is ${user?.firstName || user?.username || 'there'}. They have ${courses.length} course${courses.length !== 1 ? 's' : ''} enrolled.`;
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context,
          history: messages.slice(-6),
        }),
      });
      const { reply } = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Sorry, I could not respond right now.' },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [chatInput, isSending, messages, user, courses]);

  const handleChatKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── HeyGen helpers ───────────────────────────────────────────────────
  const stopAvatar = useCallback(async () => {
    if (avatarRef.current) {
      try { await avatarRef.current.stopAvatar(); } catch (_) {}
      avatarRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
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
    if (HEYGEN_CONFIGURED && !isConnected && !isConnecting) {
      await startAvatar(activePersona);
    }
  }, [isConnected, isConnecting, startAvatar, activePersona]);

  const handleMinimize = useCallback(() => setIsExpanded(false), []);

  const handleClose = useCallback(async () => {
    setIsExpanded(false);
    hasGreeted.current = false;
    if (HEYGEN_CONFIGURED) await stopAvatar();
  }, [stopAvatar]);

  const handlePersonaSwitch = useCallback(
    async (personaId: PersonaId) => {
      if (personaId === activePersonaId) return;
      setActivePersonaId(personaId);
      hasGreeted.current = false;
      if (!HEYGEN_CONFIGURED) return; // fallback: just switch image
      const next = PERSONAS.find((p) => p.id === personaId)!;
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

  useEffect(() => {
    return () => { stopAvatar(); };
  }, [stopAvatar]);

  // ── Collapsed button — avatar image + name + status ──────────────────
  if (!isExpanded) {
    return (
      <button
        onClick={handleExpand}
        title={`Chat with ${activePersona.name}`}
        className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-1 group"
      >
        <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-white shadow-xl group-hover:ring-blue-400 active:scale-95 transition-all duration-150 bg-gray-800">
          <Image
            src={activePersona.img}
            alt={activePersona.name}
            fill
            className="object-cover object-top"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {/* Bot icon fallback (shown if image fails to load via CSS sibling) */}
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 -z-10">
            <Bot size={22} />
          </div>
        </div>
        <div className="bg-white rounded-full px-2.5 py-0.5 shadow-md flex items-center gap-1.5 text-[11px] font-semibold text-gray-700">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
          {activePersona.name}
        </div>
      </button>
    );
  }

  // ── Shared header ────────────────────────────────────────────────────
  const panelHeader = (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isOnline ? 'bg-green-400' : isConnecting ? 'bg-yellow-400 animate-pulse' : 'bg-gray-500'
        }`} />
        <span className="text-white font-semibold text-sm truncate">{activePersona.name}</span>
        <span className="text-gray-400 text-xs flex-shrink-0">
          {isOnline ? '· Online' : '· Offline'}
        </span>
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
        <button onClick={handleMinimize} className="p-1.5 rounded-full hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors" title="Minimise">
          <Minus size={14} />
        </button>
        <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors" title="Close">
          <X size={14} />
        </button>
      </div>
    </div>
  );

  // ── Persona toggle ───────────────────────────────────────────────────
  const personaToggle = (
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
  );

  // ── Fallback panel: static image + text chat ─────────────────────────
  if (!HEYGEN_CONFIGURED) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl shadow-2xl overflow-hidden border border-gray-700 bg-gray-900 flex flex-col max-h-[85vh]">
        {panelHeader}
        {personaToggle}

        {/* Avatar image — portrait crop, face/shoulders */}
        <div className="relative h-44 bg-gray-950 flex-shrink-0">
          <Image
            src={activePersona.img}
            alt={activePersona.name}
            fill
            className="object-cover object-top"
            priority
          />
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-900 min-h-[80px]">
          {messages.length === 0 && (
            <p className="text-center text-[11px] text-gray-600 py-2">
              Ask {activePersona.name} anything about your courses
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-700 text-gray-200 rounded-bl-sm'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex justify-start">
              <div className="bg-gray-700 text-gray-400 px-3 py-2 rounded-xl rounded-bl-sm text-xs flex gap-1 items-center">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Text input */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-800 border-t border-gray-700 flex-shrink-0">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleChatKeyDown}
            placeholder="Ask me anything…"
            className="flex-1 bg-gray-700 text-white text-xs rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={!chatInput.trim() || isSending}
            className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="Send"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    );
  }

  // ── Live panel (HeyGen configured) ───────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl shadow-2xl overflow-hidden border border-gray-700 bg-gray-900">
      {panelHeader}
      {personaToggle}

      {/* HeyGen video */}
      <div className="relative bg-gray-950" style={{ aspectRatio: '16/9' }}>
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />

        {!isConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
            {connectionError ? (
              <>
                <div className="w-14 h-14 rounded-full overflow-hidden mb-2 relative">
                  <Image src={activePersona.img} alt={activePersona.name} fill className="object-cover object-top" />
                </div>
                <span className="text-gray-500 text-xs text-center px-4 mb-2">Could not connect</span>
                <button onClick={() => startAvatar(activePersona)} className="text-xs text-blue-400 hover:text-blue-300 underline">
                  Retry
                </button>
              </>
            ) : isConnecting ? (
              <>
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                <span className="text-gray-400 text-xs">Connecting to {activePersona.name}…</span>
              </>
            ) : (
              <div className="w-14 h-14 rounded-full overflow-hidden relative">
                <Image src={activePersona.img} alt={activePersona.name} fill className="object-cover object-top" />
              </div>
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
            isMicActive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isMicActive ? <MicOff size={14} /> : <Mic size={14} />}
          {isMicActive ? 'Mute' : 'Talk to assistant'}
        </button>
      </div>
    </div>
  );
}
