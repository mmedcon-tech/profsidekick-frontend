"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Phone, PhoneOff, Mic, MicOff, MessageSquare, Send, AlertTriangle } from "lucide-react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
} from "@heygen/streaming-avatar";
import { ClassSession, SessionAvatarConfig, VoiceProvider } from "@/types";
import SessionAvatarRenderer from "@/components/avatar/SessionAvatarRenderer";
import VoiceUsageIndicator from "@/components/sessions/VoiceUsageIndicator";
import VoiceUsageSummaryModal, {
  type VoiceUsageBreakdownEntry,
} from "@/components/sessions/VoiceUsageSummaryModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useEvent } from "@/contexts/EventContext";
import { useHandleServerEvent } from "@/hooks/useHandleServerEvent";
import { useTranscriptPersistence } from "@/hooks/useTranscriptPersistence";
import { useStructuredTranscript } from "@/contexts/StructuredTranscriptContext";
import { useAuth } from "@/contexts/AuthContext";
import { createRealtimeConnection, checkWebRTCSupport } from "@/lib/realtimeConnection";
import { classifyTurn } from "@/lib/turnClassifier";
import { synthesizeAssistantSpeech } from "@/lib/voiceSynthesis";
import { resolveSpeechDispatch } from "@/lib/speechDispatch";
import { logVoiceUsage } from "@/lib/voiceUsage";
import type { VisemeTimeline } from "@/lib/visemeTypes";
import {
  fetchSessionEphemeral,
  shouldUseHeyGenVideo,
} from "@/lib/sessionService";
import teachingAssistant from "@/constants/teachingAssistant";
import { config } from "@/lib/config";
import {
  navigateNextSlide,
  navigatePreviousSlide,
  navigateToIndex,
  navigateToSlideNumber,
  type SlideNavigationSource,
} from "@/lib/slideNavigation";
import {
  buildAiLeadSystemPrompt,
  buildSessionKickoffMessage,
  buildSlideNavigationTools,
  buildSlideToolResultData,
  parsePublisherInstructions,
  type SessionMode,
} from "@/lib/sessionSlideControl";

const DEFAULT_SESSION_AVATAR: SessionAvatarConfig = {
  renderType: "static",
  avatarName: "Assistant",
};

export interface TranscriptItem {
  role: "user" | "assistant";
  text: string;
}

const DEFAULT_HEYGEN_AVATAR_ID =
  process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID_FEMALE ||
  process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID_MALE ||
  '';

// Global connection tracking to prevent React Strict Mode issues
let globalConnectionId: string | null = null;
let globalConnectionPromise: Promise<void> | null = null;

interface LearningInterfaceProps {
  classSession: ClassSession;
  onEndSession: (metadata?: any) => void;
  sessionRunId?: string;
  startingSlide?: number;
  avatarConfig?: SessionAvatarConfig;
  isSharedLink?: boolean;
  sessionMode?: SessionMode;
}

export default function LearningInterface({
  classSession,
  onEndSession,
  sessionRunId,
  startingSlide,
  avatarConfig,
  isSharedLink = false,
  sessionMode: sessionModeProp,
}: LearningInterfaceProps) {
  // Always start with slide 0 for SSR consistency
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<"DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR">("DISCONNECTED");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [textInput, setTextInput] = useState("");
  const [, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    rating: 5,
    feedback: "",
    issues: "",
    suggestions: ""
  });
  const [showStartPrompt, setShowStartPrompt] = useState(true); // Show from the beginning
  const [sessionAvatar, setSessionAvatar] = useState<SessionAvatarConfig>(
    avatarConfig ?? DEFAULT_SESSION_AVATAR,
  );
  const sessionAvatarRef = useRef<SessionAvatarConfig>(
    avatarConfig ?? DEFAULT_SESSION_AVATAR,
  );
  const [isAvatarDocked, setIsAvatarDocked] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [isTranscriptVisible, setIsTranscriptVisible] = useState(false);
  const [outputAudioElement, setOutputAudioElement] = useState<HTMLAudioElement | null>(null);
  const [avatarAudioElement, setAvatarAudioElement] = useState<HTMLAudioElement | null>(null);
  const [avatarVisemeTimeline, setAvatarVisemeTimeline] = useState<VisemeTimeline | null>(null);
  const [aiLeadEnabled] = useState(true);

  // Dual voice pipeline — session-wide usage/billing state
  const [voiceProviderOverride, setVoiceProviderOverride] = useState<VoiceProvider | null>(null);
  // Persists for the rest of the session (not a dismissible toast) — shown
  // in VoiceUsageIndicator. 'platform_unavailable' = our shared ElevenLabs
  // account issue (not the subscriber's fault); 'user_low_credits' = the
  // subscriber's own balance is running low.
  const [voiceFallbackReason, setVoiceFallbackReason] = useState<
    'platform_unavailable' | 'user_low_credits' | null
  >(null);
  const [activeVoiceProvider, setActiveVoiceProvider] = useState<VoiceProvider | null>(null);
  const [voiceUsageByProvider, setVoiceUsageByProvider] = useState<
    Partial<Record<VoiceProvider, VoiceUsageBreakdownEntry>>
  >({});
  const [voiceBalance, setVoiceBalance] = useState<number | null>(null);
  const [showVoiceSummary, setShowVoiceSummary] = useState(false);
  const sessionStartBalanceRef = useRef<number | null>(null);
  const lowBalanceWarnedRef = useRef(false);
  const pendingEndMetadataRef = useRef<Record<string, unknown> | undefined>(undefined);

  const slideCount = classSession.slides.length;

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const hasConnectedRef = useRef(false);
  const currentSlideRef = useRef(0); // Initialize to 0 to match initial state
  const messageHandlerRef = useRef<((e: MessageEvent) => void) | null>(null);
  const isIntentionallyDisconnectedRef = useRef(false);
  const connectionLockRef = useRef(false); // Prevent simultaneous connections
  const disconnectFromRealtimeRef = useRef<(() => void) | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  // Lifecycle hardening: ref-based mirrors of React state to avoid stale closures
  const isTerminatingRef = useRef(false);
  const sessionStatusRef = useRef<"DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR">("DISCONNECTED");
  const isConnectingRef = useRef(false);

  // HeyGen visual layer — only initialised when shouldUseHeyGenVideo() is true
  const heygenAvatarRef = useRef<StreamingAvatar | null>(null);
  const heygenVideoRef = useRef<HTMLVideoElement>(null);
  const [heygenConnected, setHeygenConnected] = useState(false);
  // ElevenLabs voice layer — OpenAI Realtime handles transcription/text only;
  // ElevenLabs synthesises the assistant's speech (§ subscriber session runtime).
  const elevenLabsStopRef = useRef<(() => void) | null>(null);
  const elevenLabsAudioRef = useRef<HTMLAudioElement | null>(null);
  const assistantResponseInFlightRef = useRef(false);
  const currentAssistantResponseIdRef = useRef<string | null>(null);
  const interruptedAssistantResponseIdRef = useRef<string | null>(null);
  const ignoreInterruptedAssistantDoneRef = useRef(false);
  // Session-level avatar ID: backend may override DEFAULT via ephemeral response
  const heygenAvatarIdRef = useRef(DEFAULT_HEYGEN_AVATAR_ID);
  const GUARD_PHRASES = ["stop", "pause", "end session", "wait"]; // Guard phrases to allow intentional interruptions
  const MIN_VOICE_LENGTH = 0.8; // Minimum length in seconds
  const MIN_CONFIDENCE = 0.85;  // Minimum confidence from speech recognition

  const { token } = useAuth();
  const { logClientEvent, } = useEvent();
  const { currentQuestion, latestResponse, keyConcepts, rollingNotes, addStructuredTurn } = useStructuredTranscript();
  const persistTranscriptTurn = useTranscriptPersistence(classSession.sessionId, sessionRunId);

  const getRubricTerms = useCallback((): string[] => {
    try {
      const raw = classSession.classDetails.assistant_parameters?.instructions || "";
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.sessionBehavior?.rubric)) {
        return parsed.sessionBehavior.rubric.map((r: { criterion: string }) => r.criterion).filter(Boolean);
      }
    } catch { }
    return [];
  }, [classSession]);

  const handleTurnComplete = useCallback((role: "assistant" | "user", text: string) => {
    const turn = classifyTurn(role, text, getRubricTerms());
    addStructuredTurn(turn);
    void persistTranscriptTurn({ role, text });
  }, [addStructuredTurn, getRubricTerms, persistTranscriptTurn]);

  const avatarSpeechClock = useCallback(
    () => avatarAudioElement?.currentTime ?? 0,
    [avatarAudioElement],
  );

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    if (dcRef.current && dcRef.current.readyState === "open") {
      logClientEvent(eventObj, eventNameSuffix);
      dcRef.current.send(JSON.stringify(eventObj));
    } else {
      const channelState = dcRef.current?.readyState || "null";
      console.warn(`⚠️ Data channel not available (state: ${channelState}). Event:`, eventObj.type);

      logClientEvent(
        {
          attemptedEvent: eventObj.type,
          channelState: channelState,
          connectionStatus: sessionStatus
        },
        "error.data_channel_not_open"
      );

      // Try to reconnect if the connection is lost (but not if intentionally disconnected)
      if (sessionStatusRef.current === "CONNECTED" && (!dcRef.current || dcRef.current.readyState === "closed") && !isIntentionallyDisconnectedRef.current) {
        console.log("🔄 Data channel lost, attempting reconnection...");
        setSessionStatus("DISCONNECTED");
        hasConnectedRef.current = false;
        setIsConnecting(false);

        // Attempt reconnection after a short delay — uses refs to avoid stale closure
        setTimeout(() => {
          if (!hasConnectedRef.current && !isConnectingRef.current && !isIntentionallyDisconnectedRef.current && !connectionLockRef.current) {
            console.log('🔄 Auto-reconnecting due to lost connection...');
            connectToRealtime();
          }
        }, 1000);
      }
    }
  };

  const sendResponseCreate = (
    eventNameSuffix = "",
    response?: Record<string, unknown>,
  ) => {
    assistantResponseInFlightRef.current = true;
    sendClientEvent(
      response ? { type: "response.create", response } : { type: "response.create" },
      eventNameSuffix,
    );
  };

  const handleServerEventRef = useHandleServerEvent({
    setSessionStatus,
    selectedAgentName: "teachingAssistant",
    selectedAgentConfigSet: teachingAssistant,
    sendClientEvent,
    setSelectedAgentName: () => { },
    setIsOutputAudioBufferActive: () => { },
    onTurnComplete: handleTurnComplete,
  });

  const loadSessionEphemeral = useCallback(async () => {
    if (!sessionRunId) {
      throw new Error('Session run id is required');
    }
    try {
      const bundle = await fetchSessionEphemeral(
        classSession.sessionId,
        sessionRunId,
        { token, fallbackAvatar: avatarConfig ?? sessionAvatar },
      );
      setSessionAvatar(bundle.avatar);
      sessionAvatarRef.current = bundle.avatar;
      if (bundle.avatar.heygenAvatarId) {
        heygenAvatarIdRef.current = bundle.avatar.heygenAvatarId;
      }
      return { openaiToken: bundle.openaiToken, realtimeModel: bundle.realtimeModel };
    } catch (error) {
      console.error('Failed to fetch ephemeral session bundle:', error);
      throw error;
    }
  }, [classSession.sessionId, sessionRunId, token, avatarConfig, sessionAvatar]);

  const handleUserSpeech = useCallback(
    (recognizedText: string, confidence: number, duration: number) => {
      // Ignore very short phrases
      if (duration < MIN_VOICE_LENGTH) {
        console.log("Ignoring short sound:", recognizedText);
        return;
      }

      // Ignore low confidence phrases
      if (confidence < MIN_CONFIDENCE) {
        console.log("Ignoring low-confidence phrase:", recognizedText);
        return;
      }

      // Normalize text first
      const normalizedText = recognizedText.toLowerCase().trim();

      // Check for empty/short text early
      if (!normalizedText || normalizedText.length < 2) {
        console.log("Ignoring empty/short text chunk");
        return;
      }

      // --- Ignore filler or non-meaningful speech ---
      const fillerWords = [
        "uh", "um", "hmm", "ah", "er", "like", "okay", "alright", "yeah", "right"
      ];
      if (fillerWords.some(w => normalizedText === w || normalizedText.endsWith(` ${w}`))) {
        console.log("Ignoring filler phrase:", recognizedText);
        return;
      }

      // Check if this is an intentional interrupt
      const isGuard = GUARD_PHRASES.some((phrase) =>
        normalizedText.includes(phrase)
      );

      if (isGuard) {
        console.log("Intentional interruption detected:", recognizedText);
        // Handle stopping or pausing session
        if (disconnectFromRealtimeRef.current) {
          disconnectFromRealtimeRef.current();
        }
      } else {
        console.log("Ignoring non-guard phrase:", recognizedText);
        // Continue session normally
      }
    },
    []
  );



  // ── HeyGen visual layer ──────────────────────────────────────────────────────

  const stopHeyGen = useCallback(async () => {
    if (heygenAvatarRef.current) {
      try { await heygenAvatarRef.current.stopAvatar(); } catch (_) { }
      heygenAvatarRef.current = null;
    }
    if (heygenVideoRef.current) heygenVideoRef.current.srcObject = null;
    setHeygenConnected(false);
  }, []);

  const initHeyGen = useCallback(async () => {
    const avatarConfigSnapshot = sessionAvatarRef.current;
    if (!shouldUseHeyGenVideo(avatarConfigSnapshot)) return;
    const avatarId =
      avatarConfigSnapshot.heygenAvatarId ||
      heygenAvatarIdRef.current ||
      DEFAULT_HEYGEN_AVATAR_ID;
    if (!avatarId) return;
    try {
      const res = await fetch('/api/heygen/token', { method: 'POST' });
      if (!res.ok) return;
      const { token: heygenToken } = await res.json();

      const avatar = new StreamingAvatar({ token: heygenToken });
      heygenAvatarRef.current = avatar;

      avatar.on(StreamingEvents.STREAM_READY, () => {
        const stream = avatar.mediaStream;
        if (heygenVideoRef.current && stream) {
          heygenVideoRef.current.srcObject = stream;
          heygenVideoRef.current.play().catch(() => { });
        }
        setHeygenConnected(true);
      });

      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        setHeygenConnected(false);
        heygenAvatarRef.current = null;
      });

      await avatar.createStartAvatar({
        avatarName: avatarId,
        quality: AvatarQuality.Medium,
      });
    } catch (err) {
      console.error('HeyGen init error:', err);
      heygenAvatarRef.current = null;
    }
  }, []);

  // ── Dual voice pipeline (TTS) ──────────────────────────────────────────────
  // OpenAI Realtime is configured for text-only output (transcription + text
  // generation). Completed assistant turns are synthesised here via the
  // backend-resolved provider (ElevenLabs or OpenAI TTS — see
  // resolveSpeechDispatch) and fed to HeyGen (when active) for lip-synced
  // playback.

  const stopElevenLabsSpeech = useCallback(() => {
    elevenLabsStopRef.current?.();
    elevenLabsStopRef.current = null;
    setAvatarAudioElement(null);
    setAvatarVisemeTimeline(null);
  }, []);

  const interruptTtsPlayback = useCallback((reason: string) => {
    const interruptedResponseId = currentAssistantResponseIdRef.current;
    const shouldIgnoreInterruptedDone = assistantResponseInFlightRef.current;

    stopElevenLabsSpeech();

    if (shouldIgnoreInterruptedDone) {
      interruptedAssistantResponseIdRef.current = interruptedResponseId;
      ignoreInterruptedAssistantDoneRef.current = !interruptedResponseId;
      sendClientEvent({ type: "response.cancel" }, `${reason}.cancel_response`);
    }
  }, [stopElevenLabsSpeech]);

  const speakAssistantText = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean) return;

    // Feed the completed text to HeyGen so it can lip-sync/repeat it visually.
    if (heygenAvatarRef.current) {
      heygenAvatarRef.current
        .speak({ text: clean, taskType: TaskType.REPEAT })
        .catch(() => { });
    }

    stopElevenLabsSpeech();

    try {
      // Dual voice pipeline — dispatch to the backend-resolved provider/voice
      // (subscriber override > publisher default) instead of guessing gender
      // from the 3-D avatar's library entry. `voiceProviderOverride` skips
      // straight to the fallback provider once one has already been forced
      // this session (avoids retrying a known-broken ElevenLabs on every turn).
      const dispatch = resolveSpeechDispatch(
        sessionAvatarRef.current,
        voiceProviderOverride ?? undefined,
      );

      // synthesizeAssistantSpeech automatically retries via OpenAI TTS if
      // ElevenLabs fails — any such failure is a platform-side issue (shared
      // account), never the subscriber's own credit balance. `providerUsed`
      // (not `dispatch.provider`) must drive billing/notifications below,
      // since a fallback can change it mid-call.
      const { stop, audio, timeline, providerUsed, fallbackReason } = await synthesizeAssistantSpeech(
        clean,
        dispatch,
        setIsAISpeaking,
      );
      elevenLabsStopRef.current = stop;
      elevenLabsAudioRef.current = audio;
      audio.muted = !isAudioEnabled;
      setAvatarAudioElement(audio);
      setAvatarVisemeTimeline(timeline);
      setActiveVoiceProvider(providerUsed);

      if (fallbackReason === 'platform_unavailable' && voiceProviderOverride !== providerUsed) {
        setVoiceProviderOverride(providerUsed);
        setVoiceFallbackReason('platform_unavailable');
        toast.warning(
          'The premium voice service is temporarily unavailable. Your session is continuing with a standard voice.',
          { id: 'voice-fallback-platform' },
        );
      }

      // Meter the synthesized characters for usage-based billing, using the
      // provider that actually spoke — never the originally dispatched one —
      // so a platform-side fallback is never billed at the wrong rate.
      if (sessionRunId) {
        const usage = await logVoiceUsage(
          classSession.sessionId,
          sessionRunId,
          providerUsed,
          clean.length,
          token,
        );

        if (usage.insufficientCredits) {
          // This 402 comes from OUR OWN billing endpoint — it is always the
          // subscriber's own balance, never the platform's ElevenLabs
          // account (that failure mode is handled above, before billing is
          // even attempted).
          if (providerUsed === 'elevenlabs' && voiceProviderOverride !== 'openai') {
            setVoiceProviderOverride('openai');
            setVoiceFallbackReason('user_low_credits');
            toast.info('Switching to a lower-cost voice — your credits are running low.', {
              id: 'voice-fallback-credits',
            });
          } else {
            toast.error('Out of credits for voice responses. Add credits to continue hearing replies.', {
              id: 'voice-out-of-credits',
            });
          }
        } else if (usage.ok) {
          const creditsCharged = usage.creditsCharged ?? 0;
          setVoiceUsageByProvider((prev) => {
            const existing = prev[providerUsed] ?? { characters: 0, credits: 0 };
            return {
              ...prev,
              [providerUsed]: {
                characters: existing.characters + clean.length,
                credits: existing.credits + creditsCharged,
              },
            };
          });

          if (typeof usage.newBalance === 'number') {
            setVoiceBalance(usage.newBalance);
            if (sessionStartBalanceRef.current === null) {
              sessionStartBalanceRef.current = usage.newBalance + creditsCharged;
            }
            const startingBalance = sessionStartBalanceRef.current;
            if (
              !lowBalanceWarnedRef.current &&
              startingBalance > 0 &&
              usage.newBalance < startingBalance * 0.2
            ) {
              lowBalanceWarnedRef.current = true;
              toast.warning('Your credit balance is running low.', { id: 'voice-low-balance' });
            }
          }
        }
      }
    } catch (err) {
      console.error('Speech synthesis failed:', err);
    }
  }, [
    isAudioEnabled,
    stopElevenLabsSpeech,
    sessionRunId,
    classSession.sessionId,
    token,
    voiceProviderOverride,
  ]);

  // ── Shared WebRTC / media cleanup ─────────────────────────────────────────
  // Single idempotent function used by both user-disconnect and React cleanup.
  // Eliminates ~150 lines of duplication across the old disconnect functions.
  const cleanupRealtimeResources = useCallback(() => {
    // Stop HeyGen visual layer
    stopHeyGen();
    // Stop ElevenLabs speech
    stopElevenLabsSpeech();

    // Mark disconnected to block auto-reconnection and queued messages
    isIntentionallyDisconnectedRef.current = true;
    connectionLockRef.current = false;
    messageHandlerRef.current = null;

    // Reset UI state
    setIsUserSpeaking(false);
    setIsAISpeaking(false);

    // Stop media stream tracks (microphone)
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
      });
      mediaStreamRef.current = null;
    }

    // Tear down peer connection and data channel
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.enabled = false;
          sender.track.stop();
          try { pcRef.current!.removeTrack(sender); } catch { /* already removed */ }
        }
      });
      pcRef.current.getTransceivers().forEach((t) => {
        if (t.direction !== 'inactive') {
          try { t.stop(); } catch { /* already stopped */ }
        }
      });
      pcRef.current.getReceivers().forEach((r) => {
        if (r.track) r.track.stop();
      });
    }

    // Data channel cleanup
    if (dcRef.current) {
      const dc = dcRef.current;
      if ((dc as any)._messageHandler) {
        dc.removeEventListener('message', (dc as any)._messageHandler);
      }
      dcRef.current = null;
      dc.close();
      dc.onmessage = null;
      dc.onopen = null;
      dc.onclose = null;
      dc.onerror = null;
    }

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Stop audio playback
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.srcObject = null;
    }

    setDataChannel(null);
    hasConnectedRef.current = false;
  }, [stopHeyGen, stopElevenLabsSpeech]);

  // ── OpenAI Realtime connection ───────────────────────────────────────────────

  const connectToRealtime = async () => {
    const connectionId = Math.random().toString(36).substr(2, 9);

    // Use refs for race-condition-free guard checks (React state is stale in async)
    if (
      sessionStatusRef.current === "CONNECTED" ||
      sessionStatusRef.current === "CONNECTING" ||
      isConnectingRef.current ||
      hasConnectedRef.current ||
      connectionLockRef.current
    ) {
      console.log('🚫 Connection blocked:', { sessionStatus: sessionStatusRef.current, connectionId });
      return;
    }

    // Prevent React Strict Mode double-execution
    if (globalConnectionId && globalConnectionPromise) {
      console.log(`🚫 STRICT MODE PROTECTION: Connection ${connectionId} blocked`);
      return globalConnectionPromise;
    }

    connectionLockRef.current = true;
    globalConnectionId = connectionId;
    isIntentionallyDisconnectedRef.current = false;
    setSessionError(null);

    setIsConnecting(true);
    setSessionStatus("CONNECTING");
    hasConnectedRef.current = true;

    globalConnectionPromise = (async () => {
      try {
        const ephemeral = await loadSessionEphemeral();
        if (!ephemeral?.openaiToken) {
          // Token missing — terminate the session run to prevent orphan
          setSessionError('Failed to obtain session credentials. The session has been ended.');
          setSessionStatus("ERROR");
          setIsConnecting(false);
          hasConnectedRef.current = false;
          connectionLockRef.current = false;
          globalConnectionId = null;
          globalConnectionPromise = null;
          // Auto-terminate: signal the parent to stop the backend session run
          if (!isTerminatingRef.current) {
            isTerminatingRef.current = true;
            onEndSession({ ended_by_error: true, error: 'Ephemeral token missing' });
          }
          return;
        }
        const { openaiToken: EPHEMERAL_KEY, realtimeModel } = ephemeral;

        if (!audioElementRef.current) {
          audioElementRef.current = document.createElement("audio");
        }
        audioElementRef.current.autoplay = true;
        // Permanently mute the OpenAI Realtime audio track since we use ElevenLabs for the voice
        audioElementRef.current.muted = true;
        setOutputAudioElement(audioElementRef.current);

        const { pc, dc, mediaStream } = await createRealtimeConnection(
          EPHEMERAL_KEY,
          audioElementRef,
          "opus",
          realtimeModel,
          !isMicMuted,
        );

        pcRef.current = pc;
        dcRef.current = dc;
        mediaStreamRef.current = mediaStream;
        mediaStream.getAudioTracks().forEach((track) => {
          track.enabled = !isMicMuted;
        });

        dc.addEventListener("open", () => {
          logClientEvent({}, "data_channel.open");
          setSessionStatus("CONNECTED");
          setIsConnecting(false);
          hasConnectedRef.current = true;
          connectionLockRef.current = false;
          isIntentionallyDisconnectedRef.current = false;
          globalConnectionId = null;
          globalConnectionPromise = null;

          setMessageHandler();
          initializeSession();
          initHeyGen();
        });
        dc.addEventListener("close", () => {
          logClientEvent({}, "data_channel.close");
          setSessionStatus("DISCONNECTED");
          setIsConnecting(false);
          hasConnectedRef.current = false;
          connectionLockRef.current = false;
          if (globalConnectionId === connectionId) {
            globalConnectionId = null;
            globalConnectionPromise = null;
          }
        });
        dc.addEventListener("error", (err: any) => {
          logClientEvent({ error: err }, "data_channel.error");
          setSessionStatus("ERROR");
          setSessionError('Connection to the AI service was interrupted.');
          setIsConnecting(false);
          hasConnectedRef.current = false;
          connectionLockRef.current = false;
          if (globalConnectionId === connectionId) {
            globalConnectionId = null;
            globalConnectionPromise = null;
          }
        });

        // Message handler with disconnect guard
        const dataChannelMessageHandler = (e: MessageEvent) => {
          if (isIntentionallyDisconnectedRef.current) return;
          if (messageHandlerRef.current && hasConnectedRef.current) {
            messageHandlerRef.current(e);
          }
        };
        dc.addEventListener("message", dataChannelMessageHandler);
        setDataChannel(dc);
        (dc as any)._messageHandler = dataChannelMessageHandler;
      } catch (err) {
        console.error("Error connecting to realtime:", err);

        // Build user-facing error message
        let errorMessage = "Unable to connect to the AI service.";
        if (err instanceof Error) {
          if (err.message.includes('getUserMedia') || err.message.includes('HTTPS')) {
            errorMessage = "Microphone access requires HTTPS. Please use a secure connection.";
          } else if (err.message.includes('Permission denied')) {
            errorMessage = "Microphone permission was denied. Please allow access and try again.";
          } else {
            errorMessage = err.message;
          }
        }

        // Clean up partial resources
        cleanupRealtimeResources();
        setSessionStatus("ERROR");
        setSessionError(errorMessage);
        setIsConnecting(false);
        connectionLockRef.current = false;
        if (globalConnectionId === connectionId) {
          globalConnectionId = null;
          globalConnectionPromise = null;
        }

        // Auto-terminate the backend session run to prevent orphan
        if (!isTerminatingRef.current) {
          isTerminatingRef.current = true;
          onEndSession({ ended_by_error: true, error: errorMessage });
        }
      }
    })();
  };

  // User-initiated disconnect
  const disconnectFromRealtime = () => {
    console.log('Disconnecting from realtime... (user initiated)');
    globalConnectionId = null;
    globalConnectionPromise = null;
    cleanupRealtimeResources();
    setIsMicMuted(false);
    setSessionStatus("DISCONNECTED");
    setIsConnecting(false);
  };

  // Update ref so handleUserSpeech can access disconnectFromRealtime
  useEffect(() => {
    disconnectFromRealtimeRef.current = disconnectFromRealtime;
  }, [disconnectFromRealtime]);

  // Keep ref-based mirrors in sync with React state (avoids stale closures)
  useEffect(() => { sessionStatusRef.current = sessionStatus; }, [sessionStatus]);
  useEffect(() => { isConnectingRef.current = isConnecting; }, [isConnecting]);

  // React Strict Mode cleanup — same teardown but preserves global connection state
  const disconnectFromRealtimeReactCleanup = () => {
    console.log('Disconnecting from realtime... (React cleanup)');
    cleanupRealtimeResources();
    setSessionStatus("DISCONNECTED");
    setIsConnecting(false);
  };

  const initializeSession = () => {
    const mode: SessionMode =
      sessionModeProp ?? sessionAvatarRef.current.sessionMode ?? 'teaching';
    const slideIndex = currentSlideRef.current;
    const publisherInstructions = parsePublisherInstructions(
      classSession.classDetails.assistant_parameters?.instructions,
    );

    console.log("🔧 Initializing session with AI-led slide navigation...", { mode, slideIndex });

    const sessionUpdate = {
      type: "session.update",
      session: {
        // Text-only output: OpenAI Realtime handles transcription + text generation,
        // ElevenLabs synthesises the assistant's speech (see speakAssistantText).
        modalities: ["text"],
        tool_choice: "auto",
        tools: [
          ...buildSlideNavigationTools(),
          {
            type: "function",
            name: "searchKnowledgeBase",
            description:
              "Search the course materials and session slides for answers to the learner's questions.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query to look up in the knowledge base.",
                },
              },
              required: ["query"],
              additionalProperties: false,
            },
          },
        ],
        instructions: buildAiLeadSystemPrompt({
          slides: classSession.slides,
          sessionMode: mode,
          currentSlideIndex: slideIndex,
          publisherInstructions,
        }),
      },
    };

    console.log("📤 Sending session initialization:", sessionUpdate);
    const success = sendClientEvent(sessionUpdate);
    console.log("Session initialization sent successfully:", success);

    const kickoffSlide = classSession.slides[slideIndex];
    sendClientEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [
          {
            type: "input_text",
            text: buildSessionKickoffMessage(
              slideIndex,
              kickoffSlide?.title ?? `Slide ${slideIndex + 1}`,
              mode,
            ),
          },
        ],
      },
    });
    sendResponseCreate();
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    if (audioElementRef.current) {
      audioElementRef.current.muted = isAudioEnabled; // Note: isAudioEnabled is the current state, so we want the opposite
    }
    if (elevenLabsAudioRef.current) {
      elevenLabsAudioRef.current.muted = isAudioEnabled; // same flipped-closure logic as above
    }
  };

  const toggleMicrophone = () => {
    console.log('🎤 Toggling microphone:', isMicMuted ? 'unmuting' : 'muting');

    // Update the state
    const newMutedState = !isMicMuted;
    setIsMicMuted(newMutedState);

    // If we have an active media stream, enable/disable the audio tracks
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        console.log(`🎤 ${newMutedState ? 'Muting' : 'Unmuting'} audio track:`, track.id);
        track.enabled = !newMutedState; // enabled = true when not muted
      });

      console.log(`✅ Microphone ${newMutedState ? 'muted' : 'unmuted'} - ${audioTracks.length} tracks affected`);
    } else {
      console.log('⚠️ No media stream available to mute/unmute');
    }
  };

  const submitTextMessage = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const clean = textInput.trim();
    if (!clean || sessionStatus !== "CONNECTED") return;

    interruptTtsPlayback("text_input.interrupt_tts");
    setTextInput("");
    setShowStartPrompt(false);
    setIsTranscriptVisible(true);
    setTranscript((prev) => [...prev, { role: "user", text: clean }]);
    handleTurnComplete("user", clean);

    sendClientEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: clean,
          },
        ],
      },
    }, "text_input.user_message");
    sendResponseCreate("text_input.response");
  };

  const nextSlide = () => {
    const result = navigateNextSlide(currentSlideRef.current, slideCount);
    if (!result.success) return;

    currentSlideRef.current = result.currentIndex;
    setCurrentSlide(result.currentIndex);
    notifyAIOfSlideChange(result.currentIndex, result.previousIndex, "manual_navigation");
  };

  const previousSlide = () => {
    const result = navigatePreviousSlide(currentSlideRef.current, slideCount);
    if (!result.success) return;

    currentSlideRef.current = result.currentIndex;
    setCurrentSlide(result.currentIndex);
    notifyAIOfSlideChange(result.currentIndex, result.previousIndex, "manual_navigation");
  };

  const handleEndSessionClick = () => {
    setShowFeedbackModal(true);
  };

  // Dual voice pipeline — show a voice-usage summary before actually handing
  // off to onEndSession (which typically navigates away), but only when the
  // session actually synthesised any billed speech.
  const finalizeEndSession = useCallback(() => {
    const metadata = pendingEndMetadataRef.current;
    pendingEndMetadataRef.current = undefined;
    setShowVoiceSummary(false);
    if (typeof onEndSession === 'function') {
      onEndSession(metadata);
    }
  }, [onEndSession]);

  const proceedToEndSession = useCallback(
    (metadata?: Record<string, unknown>) => {
      pendingEndMetadataRef.current = metadata;
      if (Object.keys(voiceUsageByProvider).length > 0) {
        setShowVoiceSummary(true);
      } else {
        finalizeEndSession();
      }
    },
    [voiceUsageByProvider, finalizeEndSession],
  );

  const handleFeedbackSubmit = async () => {
    try {
      // Include feedback in session run metadata
      const sessionRunMetadata = {
        ended_by_user: true,
        feedback: {
          rating: feedbackData.rating,
          general_feedback: feedbackData.feedback,
          issues_encountered: feedbackData.issues,
          suggestions: feedbackData.suggestions,
          ended_at: new Date().toISOString(),
          session_duration_minutes: Math.round((Date.now() - new Date(classSession.createdAt).getTime()) / 60000)
        }
      };

      console.log('Submitting feedback:', sessionRunMetadata);

      setShowFeedbackModal(false);
      proceedToEndSession(sessionRunMetadata);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Still close modal and end session even if feedback fails
      setShowFeedbackModal(false);
      proceedToEndSession({ ended_by_user: true });
    }
  };

  const handleSkipFeedback = () => {
    setShowFeedbackModal(false);
    proceedToEndSession({ ended_by_user: true });
  };

  const handleFeedbackChange = (field: string, value: string | number) => {
    setFeedbackData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper function to notify AI about programmatic slide changes
  const notifyAIOfSlideChange = (newSlide: number, previousSlide: number, source: string = "programmatic") => {
    console.log(`📤 Notifying AI of ${source} slide change to slide ${newSlide + 1} - interrupting if speaking`);

    // Step 1: If AI is speaking, force interrupt the current response
    if (isAISpeaking) {
      console.log('🛑 AI is speaking, forcing interruption for slide change');

      interruptTtsPlayback(`slide.${source}`);

      // Then clear the output audio buffer to stop playback immediately
      // This is the key step that actually stops the audio from continuing
      sendClientEvent({
        type: "output_audio_buffer.clear"
      }, `slide.${source}.clear_audio_buffer`);

      // Small delay to ensure interruption is processed
      setTimeout(() => {
        sendSlideChangeNotification(newSlide, previousSlide, source);
      }, 50);
    } else {
      // AI is not speaking, send notification immediately
      sendSlideChangeNotification(newSlide, previousSlide, source);
    }
  };

  // Helper function to send the actual slide change notification
  const sendSlideChangeNotification = (newSlide: number, previousSlide: number, source: string) => {
    // Send as user message to simulate speech input
    const slideChangeMessage = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Stop, I just changed to slide ${newSlide + 1}, "${classSession.slides[newSlide]?.title || 'Unknown'}". Acknowledge naturally and continue with the lesson.`
          }
        ]
      }
    };

    sendClientEvent(slideChangeMessage, `slide.${source}`);

    // Trigger immediate response to the slide change
    // Small delay to ensure the message is processed before triggering response
    setTimeout(() => {
      sendResponseCreate(`slide.${source}.trigger_response`, { modalities: ["text"] });
    }, 100);
  };

  const applySlideNavigation = useCallback((
    targetIndex: number,
    source: SlideNavigationSource,
  ) => {
    const previousIndex = currentSlideRef.current;
    const result = navigateToIndex(previousIndex, targetIndex, slideCount);

    if (!result.success) {
      return result;
    }

    currentSlideRef.current = result.currentIndex;
    setCurrentSlide(result.currentIndex);

    if (source !== "ai_tool") {
      notifyAIOfSlideChange(result.currentIndex, result.previousIndex, source);
    }

    return result;
  }, [slideCount]);

  const goToSlideByIndex = (targetIndex: number) => {
    applySlideNavigation(targetIndex, "dot_navigation");
  };

  // Check WebRTC support on mount
  useEffect(() => {
    const supportCheck = checkWebRTCSupport();
    if (!supportCheck.supported && typeof window !== 'undefined') {
      console.warn('WebRTC compatibility issue:', supportCheck.error);
      setSessionStatus("ERROR");
      // Show user-friendly error immediately
      alert(supportCheck.error || 'WebRTC not supported in this browser');
    }
  }, []);

  useEffect(() => {
    const effectId = Math.random().toString(36).substr(2, 6);
    console.log(`🎯 useEffect [${effectId}] - Mount/remount detected`);
    console.log(`🎯 useEffect [${effectId}] - Current state:`, {
      hasConnected: hasConnectedRef.current,
      sessionStatus,
      globalConnectionId,
      globalConnectionPromise: !!globalConnectionPromise
    });

    // Only connect if we haven't already connected
    if (!hasConnectedRef.current && sessionStatus === "DISCONNECTED") {
      console.log(`🎯 useEffect [${effectId}] - Calling connectToRealtime`);
      connectToRealtime();
    }

    return () => {
      console.log(`🎯 useEffect [${effectId}] - Cleanup called (React Strict Mode or unmount)`);
      disconnectFromRealtimeReactCleanup();
    };
  }, []); // Empty dependency array to run only once

  // Handle hydration and set correct starting slide
  useEffect(() => {
    setIsHydrated(true);

    const getCorrectStartingSlide = () => {
      // Priority: explicit startingSlide prop > sessionStorage > session data > current (0)
      if (startingSlide !== undefined && startingSlide >= 0 && startingSlide < classSession.slides.length) {
        return startingSlide;
      }

      // Check sessionStorage for stored position
      if (sessionRunId && typeof window !== 'undefined') {
        const stored = sessionStorage.getItem(`session_${sessionRunId}_currentSlide`);
        if (stored) {
          const slideNum = parseInt(stored);
          if (slideNum >= 0 && slideNum < classSession.slides.length) {
            console.log(`📚 Resuming from stored slide position: ${slideNum + 1}`);
            return slideNum;
          }
        }
      }

      // Check if session has a stored current slide
      if ((classSession as any).currentSlide !== undefined) {
        const storedSlide = parseInt((classSession as any).currentSlide);
        if (storedSlide >= 0 && storedSlide < classSession.slides.length) {
          return storedSlide;
        }
      }

      // Keep current slide (0)
      return currentSlide;
    };

    const correctSlide = getCorrectStartingSlide();
    if (correctSlide !== currentSlide) {
      console.log(`🔄 Updating slide from ${currentSlide + 1} to ${correctSlide + 1} after hydration`);
      const previousSlide = currentSlide;
      setCurrentSlide(correctSlide);
      currentSlideRef.current = correctSlide; // Update ref immediately

      // Notify AI if we're starting on a different slide (delayed to ensure connection is ready)
      if (correctSlide !== 0) {
        setTimeout(() => {
          notifyAIOfSlideChange(correctSlide, previousSlide, "resume_session");
        }, 2000); // Give time for AI connection to be established
      }
    }
  }, []); // Run once after mount

  // Keep currentSlideRef in sync with currentSlide state
  useEffect(() => {
    console.log(`🔄 Updating slide ref: ${currentSlideRef.current} → ${currentSlide}`);
    currentSlideRef.current = currentSlide;
    console.log(`📍 Slide ref updated to: ${currentSlide + 1}/${classSession.slides.length} (ref=${currentSlideRef.current})`);
  }, [currentSlide]);

  // Auto-hide prompt after connection is established and 8 seconds pass
  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      const timer = setTimeout(() => {
        setShowStartPrompt(false);
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [sessionStatus]);

  // Hide prompt when user starts speaking
  useEffect(() => {
    if (isUserSpeaking && showStartPrompt) {
      setShowStartPrompt(false);
    }
  }, [isUserSpeaking, showStartPrompt]);

  // Function to set up the message handler with current closure
  const setMessageHandler = () => {
    console.log('🔧 Setting up message handler...');

    messageHandlerRef.current = (e: MessageEvent) => {
      const serverEvent = JSON.parse(e.data);
      console.log("🔄 Processing server event:", serverEvent.type, serverEvent);

      if (serverEvent.type === "response.created") {
        assistantResponseInFlightRef.current = true;
        currentAssistantResponseIdRef.current =
          (serverEvent.response as { id?: string } | undefined)?.id ?? null;
      }

      // --- Track voice activity ---
      if (serverEvent.type === "input_audio_buffer.speech_started") {
        setIsUserSpeaking(true);
        if (!isMicMuted) {
          interruptTtsPlayback("speech_started.interrupt_tts");
        }
      } else if (serverEvent.type === "input_audio_buffer.speech_stopped") {
        setIsUserSpeaking(false);
      }
      if (serverEvent.type === "output_audio_buffer.started") {
        setIsAISpeaking(true);
      } else if (serverEvent.type === "output_audio_buffer.stopped") {
        setIsAISpeaking(false);
      }

      // --- Assistant turn text → ElevenLabs speech + HeyGen lip-sync ---
      // OpenAI Realtime runs in text-only mode (modalities: ["text"]); the
      // completed assistant turn is extracted from response.done below.

      // --- Guard phrases: intercept intentional interruptions ---
      // Fix 2: "transcript.final" does not exist in the Realtime API; use the correct event.
      if (serverEvent.type === "conversation.item.input_audio_transcription.completed") {
        const recognizedText = serverEvent.transcript || "";
        if (recognizedText) {
          setTranscript((prev) => [...prev, { role: "user", text: recognizedText }]);
          clearTimeout((window as any)._speechHandleTimer);
          (window as any)._speechHandleTimer = setTimeout(() => {
            // confidence and duration are not available on this event; pass safe defaults
            handleUserSpeech(recognizedText, 1.0, recognizedText.split(" ").length * 0.3);
          }, 400);
        }
      }

      // --- Handle tool calls for slide navigation ---
      // Fix 1+3: send the real function result back to the Realtime API and do NOT forward
      // tool-call events to handleServerEventRef (prevents duplicate processing and dummy results).
      if (serverEvent.type === "response.done") {
        const responseId =
          (serverEvent.response as { id?: string } | undefined)?.id ?? null;
        const isInterruptedDone =
          (responseId && responseId === interruptedAssistantResponseIdRef.current) ||
          (!responseId && ignoreInterruptedAssistantDoneRef.current);

        assistantResponseInFlightRef.current = false;
        currentAssistantResponseIdRef.current = null;

        if (isInterruptedDone) {
          interruptedAssistantResponseIdRef.current = null;
          ignoreInterruptedAssistantDoneRef.current = false;
          return;
        }
      }

      if (serverEvent.type === "response.done" && serverEvent.response?.output) {
        const toolCallItems = serverEvent.response.output.filter(
          (item: any) => item.type === "function_call" && item.name
        );

        if (toolCallItems.length > 0) {
          toolCallItems.forEach((outputItem: any) => {
            const args = outputItem.arguments ? JSON.parse(outputItem.arguments) : {};
            let functionResult: { success: boolean; message: string; data: object } = { success: false, message: "", data: {} };

            if (outputItem.name === "searchKnowledgeBase") {
              const query = args.query;
              if (!sessionRunId) {
                sendClientEvent({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: outputItem.call_id,
                    output: JSON.stringify({ success: false, message: "No active session run", data: [] }),
                  },
                });
                sendResponseCreate();
                return;
              }
              // Live RAG retrieval (§11.5 searchKnowledge) — searches slide content,
              // course materials, and avatar knowledge via rag_service.retrieve_context().
              fetch(config.getApiUrl(`/api/sessions/${classSession.sessionId}/runs/${sessionRunId}/search-knowledge`), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query, top_k: 5 })
              })
                .then(res => res.json())
                .then(data => {
                  const chunks = data.results || [];
                  const functionResult = {
                    success: true,
                    message: `Found ${chunks.length} chunks of knowledge`,
                    data: chunks
                  };
                  sendClientEvent({
                    type: "conversation.item.create",
                    item: {
                      type: "function_call_output",
                      call_id: outputItem.call_id,
                      output: JSON.stringify(functionResult),
                    },
                  });
                  sendResponseCreate();
                })
                .catch(err => {
                  sendClientEvent({
                    type: "conversation.item.create",
                    item: {
                      type: "function_call_output",
                      call_id: outputItem.call_id,
                      output: JSON.stringify({ success: false, message: "Error searching knowledge base" }),
                    },
                  });
                  sendResponseCreate();
                });
              return; // Early return because we handle sending output asynchronously
            }

            if (outputItem.name === "nextSlide") {
              if (!aiLeadEnabled) {
                functionResult = {
                  success: false,
                  message: "Learner has slide control",
                  data: {},
                };
              } else {
                const result = navigateNextSlide(currentSlideRef.current, slideCount);
                if (result.success) {
                  currentSlideRef.current = result.currentIndex;
                  setCurrentSlide(result.currentIndex);
                }
                functionResult = {
                  success: result.success,
                  message: result.message,
                  data: buildSlideToolResultData(
                    classSession.slides,
                    result.currentIndex,
                    result.previousIndex,
                  ),
                };
              }
            } else if (outputItem.name === "previousSlide") {
              if (!aiLeadEnabled) {
                functionResult = {
                  success: false,
                  message: "Learner has slide control",
                  data: {},
                };
              } else {
                const result = navigatePreviousSlide(currentSlideRef.current, slideCount);
                if (result.success) {
                  currentSlideRef.current = result.currentIndex;
                  setCurrentSlide(result.currentIndex);
                }
                functionResult = {
                  success: result.success,
                  message: result.message,
                  data: buildSlideToolResultData(
                    classSession.slides,
                    result.currentIndex,
                    result.previousIndex,
                  ),
                };
              }
            } else if (outputItem.name === "goToSlide" && args.slideNumber !== undefined) {
              if (!aiLeadEnabled) {
                functionResult = {
                  success: false,
                  message: "Learner has slide control",
                  data: {},
                };
              } else {
                const slideNumber = Number(args.slideNumber);
                const result = navigateToSlideNumber(
                  currentSlideRef.current,
                  slideNumber,
                  slideCount,
                );
                if (result.success) {
                  currentSlideRef.current = result.currentIndex;
                  setCurrentSlide(result.currentIndex);
                }
                functionResult = {
                  success: result.success,
                  message: result.message,
                  data: buildSlideToolResultData(
                    classSession.slides,
                    result.currentIndex,
                    result.previousIndex,
                  ),
                };
              }
            }

            console.log(`📤 Function Response:`, functionResult);
            sendClientEvent({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: outputItem.call_id,
                output: JSON.stringify(functionResult),
              },
            });
          });
          // One response.create after all outputs are submitted
          sendResponseCreate();
          // Tool calls fully handled — do not forward to handleServerEventRef
          return;
        }

        // --- Completed assistant text turn (modalities: ["text"]) ---
        // No audio_transcript events fire in text-only mode, so the assistant's
        // turn is extracted here and handed to ElevenLabs for speech synthesis.
        const assistantMessageItems = serverEvent.response.output.filter(
          (item: any) => item.type === "message" && item.role === "assistant"
        );
        if (assistantMessageItems.length > 0) {
          const combinedText = assistantMessageItems
            .flatMap((item: any) => item.content || [])
            .map((part: any) => part.text || part.transcript || "")
            .join(" ")
            .trim();
          if (combinedText) {
            setTranscript((prev) => [...prev, { role: "assistant", text: combinedText }]);
            handleTurnComplete("assistant", combinedText);
            speakAssistantText(combinedText);
          }
        }
      }

      // Pass to the default handler for non-tool-call events
      handleServerEventRef.current(serverEvent);
    };

    console.log('✅ Message handler set up successfully');
  };

  // Session initialization happens once when connection is established
  // (moved to connectToRealtime function)

  // Log initial slide for debugging - only after hydration
  useEffect(() => {
    if (isHydrated) {
      console.log(`📍 Session running on slide ${currentSlide + 1}/${classSession.slides.length}: "${classSession.slides[currentSlide]?.title || 'Unknown'}"`);
    }
  }, [currentSlide, isHydrated]);

  // Track slide changes for analytics/resuming
  useEffect(() => {
    if (isHydrated && sessionRunId) {
      console.log(`📄 Slide changed to ${currentSlide + 1}: "${classSession.slides[currentSlide]?.title || 'Unknown'}"`);
      sessionStorage.setItem(`session_${sessionRunId}_currentSlide`, currentSlide.toString());
    }
  }, [currentSlide, isHydrated, sessionRunId, classSession.slides]);

  // Auto-scroll transcript panel to the latest message
  useEffect(() => {
    if (transcriptEndRef.current && isTranscriptVisible) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, isTranscriptVisible]);

  const currentSlideData = classSession.slides[currentSlide];

  // Fix image URL to ensure it points to backend server
  const getCorrectImageUrl = (imageUrl: string | undefined) => {
    if (!imageUrl) return '';

    // If it's already a full URL (S3 or other cloud storage), use it as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // If it's already a full URL with localhost:8000, use it as is
    if (imageUrl.startsWith(config.getApiUrl('/'))) {
      return imageUrl;
    }

    // If it's a relative URL or starts with localhost:3000, fix it
    if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('uploads/')) {
      return `${config.getApiUrl('/')}${imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl}`;
    }

    // If it includes localhost:3000, replace with localhost:8000
    if (imageUrl.includes('localhost:3000')) {
      return imageUrl.replace('localhost:3000', config.getApiUrl('/'));
    }

    // Default: prepend backend URL
    return `${config.getApiUrl('/')}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  };

  // --------------------------------------------------------------

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background font-sans text-foreground">
      {/* ── Main Layout ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ── Left Sidebar: Avatar & Controls ── */}
        <div className="flex w-[280px] shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar md:w-[320px]">
          {/* Avatar Video Area */}
          <div className="relative flex min-h-0 flex-1 flex-col items-center gap-2 bg-sidebar p-3">
            <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-sidebar-border bg-sidebar-accent shadow-xl pointer-events-none">
              <SessionAvatarRenderer
                config={sessionAvatar}
                audioElement={avatarAudioElement ?? outputAudioElement}
                isConnected={sessionStatus === "CONNECTED"}
                isAISpeaking={isAISpeaking}
                isUserSpeaking={isUserSpeaking}
                heygenConnected={sessionStatus === "CONNECTED" && !isConnecting}
                heygenVideoRef={heygenVideoRef}
                visemeTimeline={avatarVisemeTimeline}
                speechClock={avatarSpeechClock}
              />
              {sessionStatus === "CONNECTING" && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm z-20">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-xs font-medium text-white">Connecting...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Status indicator */}
            <div className="flex shrink-0 items-center gap-2 rounded-full bg-sidebar-accent px-3 py-1.5">
              <span className={cn(
                "h-2 w-2 rounded-full",
                sessionStatus === "CONNECTED" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" :
                  sessionStatus === "CONNECTING" ? "bg-amber-500 animate-pulse" : "bg-gray-400"
              )} />
              <span className="text-xs font-medium text-sidebar-foreground">
                {sessionStatus === "CONNECTED" ? (isAISpeaking ? 'AI Speaking...' : isUserSpeaking ? 'Listening...' : 'Connected') :
                  sessionStatus === "CONNECTING" ? 'Establishing link...' : 'Ready to start'}
              </span>
            </div>

            {/* Dual voice pipeline — active provider + running credit cost */}
            <div className="shrink-0">
              <VoiceUsageIndicator
                provider={activeVoiceProvider}
                creditsUsed={Object.values(voiceUsageByProvider).reduce(
                  (sum, entry) => sum + entry.credits,
                  0,
                )}
                fallbackReason={voiceFallbackReason}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex shrink-0 flex-col gap-3 border-t border-sidebar-border bg-sidebar p-4">
            {/* Voice Activity equalizers (visual only for now) */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mic className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-end gap-0.5 h-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1 rounded-full bg-primary/60 transition-all duration-75",
                        isUserSpeaking ? "animate-[eq_0.5s_ease-in-out_infinite]" : "h-1"
                      )}
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <div className="flex items-end gap-0.5 h-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1 rounded-full bg-primary/60 transition-all duration-75",
                        isAISpeaking ? "animate-[eq_0.5s_ease-in-out_infinite]" : "h-1"
                      )}
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Volume2 className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>

            {/* Mic, Sound & Transcript toggles */}
            <div className="flex gap-2">
              <button
                onClick={toggleMicrophone}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-medium transition-colors border",
                  !isMicMuted ? "bg-sidebar-accent text-sidebar-foreground border-transparent hover:bg-sidebar-accent/80" : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                )}
              >
                {!isMicMuted ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                {!isMicMuted ? "Mic On" : "Mic Off"}
              </button>
              <button
                onClick={toggleAudio}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-medium transition-colors border",
                  isAudioEnabled ? "bg-sidebar-accent text-sidebar-foreground border-transparent hover:bg-sidebar-accent/80" : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                )}
              >
                {isAudioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                {isAudioEnabled ? "Sound On" : "Sound Off"}
              </button>
              <button
                onClick={() => setIsTranscriptVisible(!isTranscriptVisible)}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-medium transition-colors border",
                  isTranscriptVisible ? "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30" : "bg-sidebar-accent text-sidebar-foreground border-transparent hover:bg-sidebar-accent/80"
                )}
              >
                <MessageSquare className="h-4 w-4" />
                {isTranscriptVisible ? "Hide Text" : "Show Text"}
              </button>
            </div>

            {/* Text input alongside voice */}
            <form onSubmit={submitTextMessage} className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(event) => setTextInput(event.target.value)}
                disabled={sessionStatus !== "CONNECTED"}
                placeholder={
                  sessionStatus === "CONNECTED"
                    ? "Type your question..."
                    : "Connect to type a question"
                }
                className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Type a message to the AI tutor"
              />
              <button
                type="submit"
                disabled={sessionStatus !== "CONNECTED" || !textInput.trim()}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-primary px-3 text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send typed message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>

            {/* Session Action Button */}
            {sessionStatus === "CONNECTED" ? (
              <button
                onClick={handleEndSessionClick}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 py-3.5 text-sm font-semibold text-destructive hover:bg-destructive/20 transition-colors mt-2"
              >
                <PhoneOff className="h-4 w-4" />
                End Session
              </button>
            ) : (
              <button
                onClick={() => {
                  if (sessionStatus === "DISCONNECTED") connectToRealtime();
                }}
                disabled={sessionStatus === "CONNECTING"}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors mt-2 disabled:opacity-50"
              >
                <Phone className="h-4 w-4" />
                {sessionStatus === "CONNECTING" ? "Connecting..." : "Start Session"}
              </button>
            )}
          </div>
        </div>

        {/* ── Center: Slides ── */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/10">

          {/* Start Conversation Prompt overlay */}
          {showStartPrompt && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className={cn(
                "px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4 border backdrop-blur-md transition-all duration-300",
                sessionStatus === "CONNECTED"
                  ? "bg-primary/90 text-primary-foreground border-primary/40 shadow-primary/20"
                  : "bg-amber-500/90 text-white border-amber-400 shadow-amber-500/20"
              )}>
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shadow-inner">
                  {sessionStatus === "CONNECTED" ? (
                    <Mic size={20} className="text-primary-foreground animate-pulse" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
                <div>
                  {sessionStatus === "CONNECTED" ? (
                    <>
                      <p className="font-bold text-sm">Ready to start!</p>
                      <p className="text-xs text-primary-foreground/80 mt-0.5">
                        Type a message, or turn on your mic when you want to speak.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-sm">Connecting...</p>
                      <p className="text-xs text-amber-50 mt-0.5">Please wait while we establish the link</p>
                    </>
                  )}
                </div>
                {sessionStatus === "CONNECTED" && (
                  <button
                    onClick={() => setShowStartPrompt(false)}
                    className="ml-2 text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error state panel — replaces alert() */}
          {sessionStatus === "ERROR" && sessionError && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-4 duration-300 w-full max-w-lg px-4">
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 backdrop-blur-md p-5 shadow-xl">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/20">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-destructive">Connection Error</p>
                    <p className="mt-1 text-xs text-destructive/80 leading-relaxed">{sessionError}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setSessionError(null);
                      setSessionStatus("DISCONNECTED");
                      isTerminatingRef.current = false;
                      hasConnectedRef.current = false;
                      connectToRealtime();
                    }}
                    className="rounded-lg bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                  >
                    Retry Connection
                  </button>
                  <button
                    onClick={handleEndSessionClick}
                    className="rounded-lg bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
                  >
                    End Session
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Slide content area */}
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 md:p-6">
            <div className="w-full max-w-4xl max-h-full flex items-center justify-center transition-all duration-500 ease-in-out">
              {currentSlideData?.imagePath ? (
                <img
                  src={getCorrectImageUrl(currentSlideData.imagePath)}
                  alt={currentSlideData?.title}
                  className="max-h-full max-w-full object-contain rounded-xl bg-card shadow-lg ring-1 ring-border/50"
                  onError={(e) => {
                    console.error('Failed to load slide image:', getCorrectImageUrl(currentSlideData.imagePath));
                  }}
                />
              ) : (
                <div className="w-full max-w-2xl bg-card rounded-2xl p-16 text-center shadow-sm border border-border flex flex-col items-center justify-center min-h-[400px]">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="h-6 w-6 text-muted-foreground opacity-50" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">No slide image available</h3>
                  <p className="text-sm text-muted-foreground">This slide does not contain visual media.</p>
                </div>
              )}
            </div>
          </div>

          {/* Slide Navigation Bar */}
          <div className="flex shrink-0 items-center justify-between border-t border-border bg-card/80 backdrop-blur-md px-4 py-3 md:px-6">
            <button
              onClick={previousSlide}
              disabled={currentSlide === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="flex flex-col items-center">
              <span className="text-sm font-semibold text-foreground">{currentSlideData?.title || `Slide ${currentSlide + 1}`}</span>
              {aiLeadEnabled && (
                <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                  AI leading session
                </span>
              )}
              <div className="flex items-center gap-1.5 mt-1">
                {Array.from({ length: slideCount }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToSlideByIndex(i)}
                    className={cn(
                      "rounded-full transition-all duration-300",
                      i === currentSlide ? "h-1.5 w-5 bg-primary" : "h-1.5 w-1.5 bg-border hover:bg-muted-foreground"
                    )}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={nextSlide}
              disabled={currentSlide === slideCount - 1}
              className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Right Sidebar: Transcript ── */}
        {isTranscriptVisible && (
          <div className="flex w-72 shrink-0 flex-col border-l border-border bg-card md:w-80 transition-all duration-300 ease-in-out">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" />
                Transcript
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTranscript([])}
                  className="text-[10px] uppercase font-bold tracking-wider text-primary hover:text-primary/80 transition-colors px-2 py-1 bg-primary/10 rounded"
                >
                  Clear
                </button>
                <button
                  onClick={() => setIsTranscriptVisible(false)}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Close transcript"
                  title="Close transcript"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {transcript.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground max-w-[200px]">
                    Transcript will appear here once the session starts.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transcript.map((msg, idx) => (
                    <div key={idx} className={cn(
                      "flex gap-3",
                      msg.role === "user" && "flex-row-reverse"
                    )}>
                      <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full shadow-sm">
                        {msg.role === "assistant" ? (
                          <div className="flex h-full w-full items-center justify-center bg-primary/10 text-[10px] font-bold text-primary/90">
                            AI
                          </div>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-primary text-[10px] font-bold text-primary-foreground">
                            ME
                          </div>
                        )}
                      </div>
                      <div className="max-w-[80%] flex flex-col gap-1">
                        <div className={cn(
                          "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                          msg.role === "assistant"
                            ? "rounded-tl-sm bg-secondary text-secondary-foreground"
                            : "rounded-tr-sm bg-primary text-primary-foreground"
                        )}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Feedback Modal ── */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 max-w-xl w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-foreground mb-2">Session Complete</h2>
            <p className="text-sm text-muted-foreground mb-8">Help us improve by sharing your experience.</p>

            {/* Rating */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-foreground mb-3">Overall Rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleFeedbackChange('rating', star)}
                    className={cn(
                      "text-3xl transition-transform hover:scale-110",
                      star <= feedbackData.rating ? "text-amber-400 drop-shadow-sm" : "text-muted"
                    )}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* General Feedback */}
            <div className="space-y-5">
              <div>
                <label htmlFor="feedback" className="block text-sm font-semibold text-foreground mb-1.5">
                  General Feedback
                </label>
                <textarea
                  id="feedback"
                  value={feedbackData.feedback}
                  onChange={(e) => handleFeedbackChange('feedback', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none text-sm resize-none"
                  placeholder="How was your overall experience?"
                />
              </div>

              <div>
                <label htmlFor="issues" className="block text-sm font-semibold text-foreground mb-1.5">
                  Issues Encountered
                </label>
                <textarea
                  id="issues"
                  value={feedbackData.issues}
                  onChange={(e) => handleFeedbackChange('issues', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none text-sm resize-none"
                  placeholder="Did you encounter any technical issues?"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end mt-8">
              <button
                onClick={handleSkipFeedback}
                className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleFeedbackSubmit}
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium shadow-sm hover:bg-primary/90 transition-all active:scale-95"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      <VoiceUsageSummaryModal
        open={showVoiceSummary}
        usageByProvider={voiceUsageByProvider}
        balance={voiceBalance}
        onContinue={finalizeEndSession}
      />

      {/* Global styles for equalizer animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes eq {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1.2); }
        }
      `}} />
    </div>
  );
}
