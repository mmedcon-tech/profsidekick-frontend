'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  KeyboardEvent,
} from 'react';
import Image from 'next/image';
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
} from '@heygen/streaming-avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';
import { useSubscriberStats } from '@/hooks/useSubscriberStats';
import {
  buildAssistantGreeting,
  buildAssistantSystemPrompt,
} from '@/lib/assistantContext';
import { isHeyGenEnabled, isHeyGenAvatarIdsConfigured } from '@/lib/heygenConfig';
import AiMessage from '@/components/shared/AiMessage';
import {
  Bot,
  Mic,
  MicOff,
  Minus,
  X,
  Send,
  MessageSquare,
  PhoneOff,
  RotateCcw,
  Volume2,
} from 'lucide-react';

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

const HEYGEN_LIVE = isHeyGenEnabled() && isHeyGenAvatarIdsConfigured();

type PersonaId = 'female' | 'male';
type PanelMode = 'chat' | 'voice';
type ChatMessage = { role: 'user' | 'assistant'; text: string };

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: Array<Array<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export default function FloatingAvatar(): React.ReactElement {
  const { user } = useAuth();
  const { courses } = useCourses();
  const { stats } = useSubscriberStats(courses.length);

  const [isExpanded, setIsExpanded] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>('chat');
  const [activePersonaId, setActivePersonaId] = useState<PersonaId>('female');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasSeededGreeting = useRef(false);

  const avatarRef = useRef<StreamingAvatar | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasGreetedHeyGen = useRef(false);
  const recognitionRef = useRef<{ stop: () => void; start: () => void } | null>(null);

  const activePersona = PERSONAS.find((p) => p.id === activePersonaId) ?? PERSONAS[0];

  const learnerContext = useMemo(
    () => ({
      userName:
        [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
        user?.username ||
        'there',
      assistantName: activePersona.name,
      courses,
      stats,
    }),
    [user, activePersona.name, courses, stats],
  );

  const systemPrompt = useMemo(
    () => buildAssistantSystemPrompt(learnerContext),
    [learnerContext],
  );

  const isOnline = HEYGEN_LIVE ? isConnected : true;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isExpanded || hasSeededGreeting.current) return;
    hasSeededGreeting.current = true;
    setMessages([
      { role: 'assistant', text: buildAssistantGreeting(learnerContext) },
    ]);
  }, [isExpanded, learnerContext]);

  const askAssistant = useCallback(
    async (text: string, history: ChatMessage[]): Promise<string> => {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          systemPrompt,
          history,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.detail || 'Assistant unavailable');
      }
      return data.reply as string;
    },
    [systemPrompt],
  );

  const sendMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || isSending) return;

    setChatInput('');
    const userMsg: ChatMessage = { role: 'user', text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setIsSending(true);

    try {
      const reply = await askAssistant(text, messages);
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Sorry, I could not respond right now. Please try again.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [chatInput, isSending, messages, askAssistant]);

  const handleChatKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const speakReply = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopBrowserVoice = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
  }, []);

  const handleVoiceTranscript = useCallback(
    async (transcript: string) => {
      const userMsg: ChatMessage = { role: 'user', text: transcript };
      const nextHistory = [...messages, userMsg];
      setMessages(nextHistory);
      setIsSending(true);
      try {
        const reply = await askAssistant(transcript, messages);
        setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
        speakReply(reply);
      } catch {
        const fallback = 'Sorry, I could not respond right now.';
        setMessages((prev) => [...prev, { role: 'assistant', text: fallback }]);
        speakReply(fallback);
      } finally {
        setIsSending(false);
      }
    },
    [messages, askAssistant, speakReply],
  );

  const toggleBrowserVoice = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SR =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;

    if (!SR) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Voice input is not supported in this browser. Please use text chat.',
        },
      ]);
      return;
    }

    if (isListening) {
      stopBrowserVoice();
      return;
    }

    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) void handleVoiceTranscript(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }, [isListening, stopBrowserVoice, handleVoiceTranscript]);

  const stopAvatar = useCallback(async () => {
    if (avatarRef.current) {
      try {
        await avatarRef.current.stopAvatar();
      } catch (_) {}
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

          if (!hasGreetedHeyGen.current) {
            hasGreetedHeyGen.current = true;
            await avatar.speak({
              text: buildAssistantGreeting(learnerContext),
              taskType: TaskType.REPEAT,
            });
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
    [learnerContext],
  );

  const handleExpand = useCallback(async () => {
    setPanelMode('chat');
    setIsExpanded(true);
    if (HEYGEN_LIVE && panelMode === 'voice' && !isConnected && !isConnecting) {
      await startAvatar(activePersona);
    }
  }, [isConnected, isConnecting, startAvatar, activePersona, panelMode]);

  const handleMinimize = useCallback(() => {
    stopBrowserVoice();
    setIsExpanded(false);
  }, [stopBrowserVoice]);

  const handleClose = useCallback(async () => {
    stopBrowserVoice();
    setIsExpanded(false);
    hasSeededGreeting.current = false;
    hasGreetedHeyGen.current = false;
    setMessages([]);
    if (HEYGEN_LIVE) await stopAvatar();
  }, [stopAvatar, stopBrowserVoice]);

  const handlePersonaSwitch = useCallback(
    async (personaId: PersonaId) => {
      if (personaId === activePersonaId) return;
      setActivePersonaId(personaId);
      hasGreetedHeyGen.current = false;
      hasSeededGreeting.current = false;
      setMessages([
        {
          role: 'assistant',
          text: buildAssistantGreeting({
            ...learnerContext,
            assistantName:
              PERSONAS.find((p) => p.id === personaId)?.name ?? activePersona.name,
          }),
        },
      ]);
      hasSeededGreeting.current = true;
      if (!HEYGEN_LIVE) return;
      const next = PERSONAS.find((p) => p.id === personaId)!;
      await stopAvatar();
      if (panelMode === 'voice') await startAvatar(next);
    },
    [activePersonaId, activePersona.name, learnerContext, stopAvatar, startAvatar, panelMode],
  );

  const switchToVoice = useCallback(async () => {
    setPanelMode('voice');
    if (HEYGEN_LIVE && !isConnected && !isConnecting) {
      await startAvatar(activePersona);
    }
  }, [isConnected, isConnecting, startAvatar, activePersona]);

  const toggleHeyGenMic = useCallback(async () => {
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
    return () => {
      stopBrowserVoice();
      void stopAvatar();
    };
  }, [stopAvatar, stopBrowserVoice]);

  const progressLabel =
    stats != null
      ? `${stats.overallProgressPct}% session progress · ${stats.completedRuns} completed runs`
      : 'Loading your progress…';

  if (!isExpanded) {
    return (
      <button
        onClick={() => void handleExpand()}
        title={`Chat with ${activePersona.name}`}
        className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-1 group"
      >
        <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-white shadow-xl group-hover:ring-emerald-400 active:scale-95 transition-all duration-150 bg-gray-800">
          <Image
            src={activePersona.img}
            alt={activePersona.name}
            fill
            className="object-cover object-top"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 -z-10">
            <Bot size={22} />
          </div>
        </div>
        <div className="bg-white rounded-full px-2.5 py-0.5 shadow-md flex items-center gap-1.5 text-[11px] font-semibold text-gray-700">
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
          />
          {activePersona.name}
        </div>
      </button>
    );
  }

  const panelHeader = (
    <div className="flex items-center justify-between px-4 py-3 bg-emerald-900 border-b border-emerald-800">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isOnline ? 'bg-green-400' : isConnecting ? 'bg-yellow-400 animate-pulse' : 'bg-gray-500'
          }`}
        />
        <span className="text-white font-semibold text-sm truncate">
          {activePersona.name} · AI Training Assistant
        </span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
        <button
          type="button"
          onClick={() => setPanelMode('chat')}
          className={`px-2 py-1 rounded text-[11px] font-medium ${
            panelMode === 'chat' ? 'bg-white text-emerald-900' : 'text-emerald-100 hover:bg-emerald-800'
          }`}
        >
          Chat
        </button>
        <button
          type="button"
          onClick={() => void switchToVoice()}
          className={`px-2 py-1 rounded text-[11px] font-medium ${
            panelMode === 'voice' ? 'bg-white text-emerald-900' : 'text-emerald-100 hover:bg-emerald-800'
          }`}
        >
          Voice
        </button>
        <button
          type="button"
          onClick={handleMinimize}
          className="p-1.5 rounded-full hover:bg-emerald-800 text-emerald-100"
          title="Minimise"
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          onClick={() => void handleClose()}
          className="p-1.5 rounded-full hover:bg-emerald-800 text-emerald-100"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );

  const personaToggle = (
    <div className="flex gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800">
      {PERSONAS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => void handlePersonaSwitch(p.id)}
          disabled={isConnecting}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all disabled:opacity-50 ${
            activePersonaId === p.id
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
          }`}
        >
          {p.name} · {p.label}
        </button>
      ))}
    </div>
  );

  const progressBanner = (
    <div className="px-4 py-2 bg-emerald-950/40 border-b border-gray-800 text-[10px] text-emerald-200/90">
      {courses.length} course{courses.length === 1 ? '' : 's'} enrolled · {progressLabel}
    </div>
  );

  const avatarPortrait = (
    <div className="relative flex flex-col items-center bg-gradient-to-b from-emerald-950 to-gray-950 px-4 pt-5 pb-4 flex-shrink-0">
      <div className="relative h-36 w-36 overflow-hidden rounded-full ring-4 ring-emerald-600/80 shadow-xl">
        {HEYGEN_LIVE && panelMode === 'voice' && isConnected ? (
          <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
        ) : (
          <Image
            src={activePersona.img}
            alt={activePersona.name}
            fill
            className="object-cover object-top"
            priority
            sizes="144px"
          />
        )}
        {HEYGEN_LIVE && panelMode === 'voice' && isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          </div>
        )}
      </div>
      {panelMode === 'voice' && (
        <p className="mt-3 text-xs text-emerald-200/80">Tap the mic and ask your question</p>
      )}
    </div>
  );

  const greetingText =
    messages.find((m) => m.role === 'assistant')?.text ??
    buildAssistantGreeting(learnerContext);

  const followUpMessages = messages.length > 1 ? messages.slice(1) : [];

  if (panelMode === 'voice' && !HEYGEN_LIVE) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-[22rem] rounded-2xl shadow-2xl overflow-hidden border border-gray-700 bg-gray-900 flex flex-col max-h-[90vh]">
        {panelHeader}
        {personaToggle}
        {progressBanner}
        {avatarPortrait}
        <div className="border-b border-gray-800 bg-gray-900 px-4 py-3">
          <AiMessage content={greetingText} className="text-sm leading-relaxed text-gray-200" />
        </div>
        <div className="flex items-center justify-center gap-4 bg-gray-900 py-5">
          <button
            type="button"
            className="rounded-full p-2 text-gray-500 hover:text-gray-300"
            title="Volume"
            aria-label="Volume"
          >
            <Volume2 size={18} />
          </button>
          <button
            type="button"
            onClick={() => void toggleBrowserVoice()}
            disabled={isSending}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-amber-400 hover:bg-amber-500'
            }`}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? <MicOff size={28} className="text-white" /> : <Mic size={28} className="text-gray-900" />}
          </button>
          <button
            type="button"
            onClick={() => {
              hasSeededGreeting.current = false;
              setMessages([]);
              setMessages([
                { role: 'assistant', text: buildAssistantGreeting(learnerContext) },
              ]);
              hasSeededGreeting.current = true;
            }}
            className="rounded-full p-2 text-gray-500 hover:text-gray-300"
            title="Reset conversation"
          >
            <RotateCcw size={18} />
          </button>
        </div>
        <div className="flex items-center justify-center border-t border-gray-800 bg-gray-900 px-4 py-3">
          <button
            type="button"
            onClick={() => void handleClose()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600/90 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            <PhoneOff size={16} />
            End
          </button>
        </div>
      </div>
    );
  }

  if (panelMode === 'voice' && HEYGEN_LIVE) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-[22rem] rounded-2xl shadow-2xl overflow-hidden border border-gray-700 bg-gray-900">
        {panelHeader}
        {personaToggle}
        {progressBanner}
        {avatarPortrait}
        <div className="px-4 py-3 text-center bg-gray-900">
          <p className="text-xs text-gray-400 mb-2">Tap the mic and ask your question</p>
          <AiMessage content={greetingText} className="text-sm text-gray-200 leading-relaxed" />
        </div>
        <div className="flex items-center justify-center py-4 bg-gray-800 border-t border-gray-700">
          <button
            type="button"
            onClick={() => void toggleHeyGenMic()}
            disabled={!isConnected}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
              isMicActive ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-400 hover:bg-amber-500'
            } disabled:opacity-40`}
          >
            {isMicActive ? <MicOff size={28} className="text-white" /> : <Mic size={28} className="text-gray-900" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex max-h-[90vh] w-[24rem] flex-col overflow-hidden rounded-2xl border border-emerald-900/40 bg-gray-900 shadow-2xl">
      {panelHeader}
      {personaToggle}
      {progressBanner}
      {avatarPortrait}

      <div className="border-b border-gray-800 bg-gray-900 px-4 py-3">
        <AiMessage content={greetingText} className="text-sm leading-relaxed text-gray-200" />
      </div>

      <div className="min-h-[80px] flex-1 space-y-2 overflow-y-auto bg-gray-900 px-3 py-3">
        {followUpMessages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'rounded-br-sm bg-emerald-600 text-white'
                  : 'rounded-bl-sm bg-gray-800 text-gray-200'
              }`}
            >
              {m.role === 'user' ? m.text : <AiMessage content={m.text} />}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-gray-800 px-3 py-2 text-xs text-gray-400">Thinking…</div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="flex flex-shrink-0 items-center gap-2 border-t border-gray-700 bg-gray-800 px-3 py-2.5">
        <MessageSquare size={14} className="flex-shrink-0 text-gray-500" />
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={handleChatKeyDown}
          placeholder="Ask about your courses or progress…"
          className="flex-1 rounded-lg bg-gray-700 px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="button"
          onClick={() => void sendMessage()}
          disabled={!chatInput.trim() || isSending}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
          aria-label="Send"
        >
          <Send size={13} />
        </button>
      </div>

      <div className="bg-gray-800 px-3 pb-3">
        <button
          type="button"
          onClick={() => void switchToVoice()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 py-2.5 text-xs font-semibold text-gray-900 hover:bg-amber-500"
        >
          <Mic size={14} />
          Talk to assistant
        </button>
      </div>
    </div>
  );
}
