"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Phone, PhoneOff, Mic, MicOff, MessageSquare, Send } from "lucide-react";
import TranscriptPanel from "@/components/learning/TranscriptPanel";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
} from "@heygen/streaming-avatar";
import { ClassSession, SessionAvatarConfig } from "@/types";
import SessionAvatarRenderer from "@/components/avatar/SessionAvatarRenderer";
import { cn } from "@/lib/utils";
import { useEvent } from "@/contexts/EventContext";
import { useHandleServerEvent } from "@/hooks/useHandleServerEvent";
import { useTranscriptPersistence } from "@/hooks/useTranscriptPersistence";
import { useStructuredTranscript } from "@/contexts/StructuredTranscriptContext";
import { useAuth } from "@/contexts/AuthContext";
import { createRealtimeConnection, checkWebRTCSupport } from "@/lib/realtimeConnection";
import { classifyTurn } from "@/lib/turnClassifier";
import {
  fetchSessionEphemeral,
  shouldUseHeyGenVideo,
} from "@/lib/sessionService";
import teachingAssistant from "@/constants/teachingAssistant";
import { config } from "@/lib/config";
import {
  navigateToIndex,
  type SlideNavigationResult,
  type SlideNavigationSource,
} from "@/lib/slideNavigation";
import {
  buildAiLeadSystemPrompt,
  buildSessionKickoffMessage,
  buildSlideNavigationTools,
  parsePublisherInstructions,
  type LearnerSlideChangeAction,
  type SessionMode,
} from "@/lib/sessionSlideControl";
import {
  detectSlideAdvanceFromSpeech,
  extractRealtimeToolCalls,
} from "@/lib/slideAdvanceFromSpeech";
import {
  buildRealtimeSlideToolResponse,
  isRealtimeSlideTool,
  resolveSlideToolTarget,
  type RealtimeSlideToolName,
} from "@/lib/realtimeSlideTools";
import { pickRealtimeVoiceForAvatar } from "@/lib/realtimeVoice";
import { getDefaultChatbotAvatar } from "@/lib/avatarLibrary";
import { useRealtimeTeachingLipSync } from "@/hooks/useRealtimeTeachingLipSync";
import { useElevenLabsAudioSink } from "@/hooks/useElevenLabsAudioSink";
import { notifyLearnerSlideChangeToRealtime } from "@/lib/learnerSlideRealtimeNotify";
import { toast } from "sonner";

const defaultTeachingAvatar = getDefaultChatbotAvatar();
const DEFAULT_SESSION_AVATAR: SessionAvatarConfig = {
  renderType: "glb",
  avatarName: defaultTeachingAvatar.name,
  glbLibraryId: defaultTeachingAvatar.id,
  modelUrl: defaultTeachingAvatar.glbPath,
  imageUrl: defaultTeachingAvatar.thumbnailPath,
};

export interface TranscriptItem {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const createTranscriptId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

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
  const [aiLeadEnabled] = useState(true);

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
  const awaitingSessionConfigRef = useRef(false);
  const slideToolHandledThisTurnRef = useRef(false);
  const isAISpeakingRef = useRef(false);
  const handledRealtimeToolCallIdsRef = useRef(new Set<string>());
  const performAiSlideAdvanceRef = useRef<(targetIndex: number) => SlideNavigationResult>(
    () => ({
      success: false,
      previousIndex: 0,
      currentIndex: 0,
      message: "Not ready",
    }),
  );
  const onSlideToolRef = useRef<
    ((toolName: RealtimeSlideToolName, args: Record<string, unknown>) => {
      success: boolean;
      message: string;
      data: object;
    } | null) | null
  >(null);
  const handleRealtimeSlideToolRef = useRef(onSlideToolRef.current);
  const sendClientEventRef = useRef<(eventObj: Record<string, unknown>, suffix?: string) => void>(
    () => undefined,
  );

  // "Mouth" for the ElevenLabs voice engine — only ever fed text when the
  // resolved avatar's voiceProvider is 'elevenlabs' (see initializeSession /
  // setMessageHandler). Its <audio> element replaces the OpenAI WebRTC one
  // below in that case, so lip sync reuses the existing amplitude pipeline
  // unmodified — it never touches realtimeConnection.ts or the OpenAI path.
  const elevenLabsSink = useElevenLabsAudioSink({
    voiceId: sessionAvatar.voiceId,
    onSpeakingChange: setIsAISpeaking,
  });
  const elevenLabsTurnTextRef = useRef("");
  const elevenLabsPendingClauseRef = useRef("");

  const activeOutputAudioElement =
    sessionAvatar.voiceProvider === "elevenlabs"
      ? elevenLabsSink.audioElement
      : outputAudioElement;

  const lipSyncAmplitude = useRealtimeTeachingLipSync(
    activeOutputAudioElement,
    sessionStatus === "CONNECTED",
  );

  useEffect(() => {
    isAISpeakingRef.current = isAISpeaking;
  }, [isAISpeaking]);

  // HeyGen visual layer — only initialised when shouldUseHeyGenVideo() is true
  const heygenAvatarRef = useRef<StreamingAvatar | null>(null);
  const heygenVideoRef = useRef<HTMLVideoElement>(null);
  const [heygenConnected, setHeygenConnected] = useState(false);
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
      if (sessionStatus === "CONNECTED" && (!dcRef.current || dcRef.current.readyState === "closed") && !isIntentionallyDisconnectedRef.current) {
        console.log("🔄 Data channel lost, attempting reconnection...");
        setSessionStatus("DISCONNECTED");
        hasConnectedRef.current = false;
        setIsConnecting(false);

        // Attempt reconnection after a short delay - BUT ONLY IF NOT ALREADY CONNECTING
        setTimeout(() => {
          // Check if we're not already trying to connect using the ref and still not intentionally disconnected
          console.log('🔄 Auto-reconnection check:', {
            hasConnectedRef: hasConnectedRef.current,
            isConnecting: isConnecting,
            isIntentionallyDisconnected: isIntentionallyDisconnectedRef.current,
            connectionLock: connectionLockRef.current,
            sessionStatus: sessionStatus
          });

          if (!hasConnectedRef.current && !isConnecting && !isIntentionallyDisconnectedRef.current && !connectionLockRef.current) {
            console.log('🔄 Auto-reconnecting due to lost connection...');
            connectToRealtime();
          } else {
            console.log('🚫 Auto-reconnection blocked - connection in progress or intentionally disconnected');
          }
        }, 1000);
      }
    }
  };

  sendClientEventRef.current = sendClientEvent;

  const handleServerEventRef = useHandleServerEvent({
    setSessionStatus,
    selectedAgentName: "teachingAssistant",
    selectedAgentConfigSet: teachingAssistant,
    sendClientEvent,
    setSelectedAgentName: () => { },
    setIsOutputAudioBufferActive: () => { },
    onTurnComplete: handleTurnComplete,
    onSlideToolRef,
  });

  const loadSessionEphemeral = useCallback(async () => {
    if (!sessionRunId) {
      throw new Error('Session run id is required');
    }
    try {
      const bundle = await fetchSessionEphemeral(
        classSession.sessionId,
        sessionRunId,
        {
          token,
          fallbackAvatar: avatarConfig ?? sessionAvatarRef.current ?? DEFAULT_SESSION_AVATAR,
        },
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

  // ── OpenAI Realtime connection ───────────────────────────────────────────────

  const connectToRealtime = async () => {
    // Generate unique connection ID for this attempt
    const connectionId = Math.random().toString(36).substr(2, 9);

    // Prevent duplicate connections
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING" || isConnecting || hasConnectedRef.current || connectionLockRef.current) {
      console.log('🚫 Connection blocked - already in progress or established:', {
        sessionStatus,
        isConnecting,
        hasConnectedRef: hasConnectedRef.current,
        connectionLock: connectionLockRef.current
      });
      return;
    }

    // CRITICAL: Prevent React Strict Mode double-execution
    if (globalConnectionId && globalConnectionPromise) {
      console.log(`🚫 STRICT MODE PROTECTION: Connection ${connectionId} blocked - ${globalConnectionId} already connecting`);
      return globalConnectionPromise;
    }

    console.log(`🔐 Acquiring connection lock... [${connectionId}]`);
    connectionLockRef.current = true; // Lock immediately to prevent race conditions
    globalConnectionId = connectionId;

    console.log(`Starting realtime connection... [${connectionId}]`);

    // Clear the intentional disconnect flag when manually connecting
    isIntentionallyDisconnectedRef.current = false;

    setIsConnecting(true);
    setSessionStatus("CONNECTING");
    hasConnectedRef.current = true;

    // Create a promise to track this connection
    globalConnectionPromise = (async () => {
      try {
        const ephemeral = await loadSessionEphemeral();
        if (!ephemeral?.openaiToken) {
          setSessionStatus("ERROR");
          setIsConnecting(false);
          hasConnectedRef.current = false;
          connectionLockRef.current = false; // Release lock on error
          globalConnectionId = null;
          globalConnectionPromise = null;
          return;
        }
        const { openaiToken: EPHEMERAL_KEY, realtimeModel } = ephemeral;

        if (!audioElementRef.current) {
          audioElementRef.current = document.createElement("audio");
        }
        audioElementRef.current.autoplay = true;
        audioElementRef.current.muted = !isAudioEnabled;
        setOutputAudioElement(audioElementRef.current);

        // Generate unique ID for this connection
        const dataChannelId = Math.random().toString(36).substr(2, 9);

        console.log(`🌐 Creating WebRTC connection... [${connectionId}] -> [${dataChannelId}]`);
        console.log(`🎯 Using model for session ${sessionRunId}: ${realtimeModel}`);

        const { pc, dc, mediaStream } = await createRealtimeConnection(
          EPHEMERAL_KEY,
          audioElementRef,
          "opus",
          realtimeModel,
          !isMicMuted,
        );

        console.log(`🔗 Created new peer connection and data channel [${connectionId}] -> [${dataChannelId}] - Lock: ${connectionLockRef.current}`);
        console.log(`🔗 Data channel ready state: ${dc.readyState}`);

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
          hasConnectedRef.current = true; // Mark as successfully connected
          connectionLockRef.current = false; // Release lock on successful connection
          isIntentionallyDisconnectedRef.current = false; // Reset disconnect flag for active connection
          globalConnectionId = null;
          globalConnectionPromise = null;

          // Set up message handler immediately when data channel opens
          setMessageHandler();

          initializeSession(); // Enable tools for AI

          // Start HeyGen visual layer alongside OpenAI voice (no-op if not configured)
          initHeyGen();
        });
        dc.addEventListener("close", () => {
          logClientEvent({}, "data_channel.close");
          setSessionStatus("DISCONNECTED");
          setIsConnecting(false);
          hasConnectedRef.current = false;
          connectionLockRef.current = false; // Release lock on close
          if (globalConnectionId === connectionId) {
            globalConnectionId = null;
            globalConnectionPromise = null;
          }
        });
        dc.addEventListener("error", (err: any) => {
          logClientEvent({ error: err }, "data_channel.error");
          setSessionStatus("ERROR");
          setIsConnecting(false);
          hasConnectedRef.current = false;
          connectionLockRef.current = false; // Release lock on error
          if (globalConnectionId === connectionId) {
            globalConnectionId = null;
            globalConnectionPromise = null;
          }
        });

        // Store the message handler for proper cleanup
        const dataChannelMessageHandler = (e: MessageEvent) => {
          // FIRST CHECK: Global disconnect state (highest priority)
          if (isIntentionallyDisconnectedRef.current) {
            console.log(`🛑 BLOCKED: Message ignored due to intentional disconnect [${dataChannelId}]`);
            return; // Exit immediately
          }

          if (messageHandlerRef.current && hasConnectedRef.current) {
            messageHandlerRef.current(e);
          }
        };

        // Handle server events with custom tool call logic
        dc.addEventListener("message", dataChannelMessageHandler);

        setDataChannel(dc);

        // Store the handler reference for cleanup (after setDataChannel)
        (dc as any)._messageHandler = dataChannelMessageHandler;
      } catch (err) {
        console.error("Error connecting to realtime:", err);

        // Provide specific error message for getUserMedia issues
        let errorMessage = "Error connecting to realtime";
        if (err instanceof Error) {
          if (err.message.includes('getUserMedia') || err.message.includes('HTTPS')) {
            errorMessage = "Microphone access requires HTTPS. Please ensure you're using a secure connection.";
          } else if (err.message.includes('Permission denied')) {
            errorMessage = "Microphone permission denied. Please allow microphone access and try again.";
          } else {
            errorMessage = err.message;
          }
        }

        // Set error status with message
        setSessionStatus("ERROR");
        setIsConnecting(false);

        // Show error to user
        alert(errorMessage);

        // Clean up any partial connections
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
        }
        if (dcRef.current) {
          dcRef.current.close();
          dcRef.current = null;
        }

        setSessionStatus("ERROR");
        setIsConnecting(false);
        hasConnectedRef.current = false;
        connectionLockRef.current = false; // Release lock on error
        if (globalConnectionId === connectionId) {
          globalConnectionId = null;
          globalConnectionPromise = null;
        }
      }
    })();
  };

  const disconnectFromRealtime = () => {
    console.log('Disconnecting from realtime... (user initiated)');

    // Stop HeyGen visual layer cleanly
    stopHeyGen();

    // Mark as intentionally disconnected to prevent auto-reconnection
    isIntentionallyDisconnectedRef.current = true;

    // Release connection lock immediately to prevent issues
    connectionLockRef.current = false;

    // Clear global connection state for real disconnects
    console.log('🧹 Clearing global connection state (real disconnect)');
    globalConnectionId = null;
    globalConnectionPromise = null;

    // Immediately clear the message handler to stop processing any new messages
    messageHandlerRef.current = null;

    // Reset states immediately to prevent any UI updates from queued messages
    setIsUserSpeaking(false);
    setIsAISpeaking(false);
    setIsMicMuted(false); // Reset mic mute state on disconnect
    setSessionStatus("DISCONNECTED");
    setIsConnecting(false);
    hasConnectedRef.current = false;

    // FIRST: Immediately disable microphone tracks to stop any new audio capture
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        // Immediately disable the track to stop capture
        track.enabled = false;
        // Then stop it completely
        track.stop();
      });
      mediaStreamRef.current = null;
    }

    // AGGRESSIVE CLEANUP: Force stop ALL active media tracks globally
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
    }

    if (pcRef.current) {
      // STEP 1: Remove all tracks from the peer connection to stop transmission
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.enabled = false;
          sender.track.stop();
          // Remove the track from the peer connection
          pcRef.current!.removeTrack(sender);
        }
      });

      // STEP 2: Stop all transceivers to halt media negotiation
      pcRef.current.getTransceivers().forEach((transceiver) => {
        if (transceiver.direction !== 'inactive') {
          transceiver.stop();
        }
      });

      // STEP 3: Stop all receiver tracks
      pcRef.current.getReceivers().forEach((receiver) => {
        if (receiver.track) {
          receiver.track.stop();
        }
      });

      // STEP 4: Properly handle data channel closure with state monitoring
      if (dcRef.current) {
        const originalDc = dcRef.current;

        // Remove the specific message handler we stored
        if ((originalDc as any)._messageHandler) {
          originalDc.removeEventListener("message", (originalDc as any)._messageHandler);
        }

        try {
          const events = ['message', 'open', 'close', 'error'];
          events.forEach(eventType => {
            const dummyHandler = () => { };
            originalDc.addEventListener(eventType, dummyHandler);
            originalDc.removeEventListener(eventType, dummyHandler);
          });
        } catch (e) {
        }

        // Add a one-time listener for the close event
        const closeHandler = () => {
          console.log('✅ Data channel actually closed - state:', originalDc.readyState);
          console.log('✅ Timestamp of close:', new Date().toISOString());
          originalDc.removeEventListener('close', closeHandler);
        };
        originalDc.addEventListener('close', closeHandler);

        // Nullify our reference immediately to prevent new usage
        dcRef.current = null;

        // Close the data channel
        originalDc.close();

        // Force stop any remaining message processing by overriding ALL message handlers
        originalDc.onmessage = null;
        originalDc.onopen = null;
        originalDc.onclose = null;
        originalDc.onerror = null;
      }

      // STEP 5: Monitor connection state during close

      // Add a listener to verify the connection actually closes
      const connectionCloseHandler = () => {
      };
      pcRef.current.addEventListener('connectionstatechange', connectionCloseHandler);

      // STEP 6: Finally close the peer connection
      pcRef.current.close();

      // Check state immediately after close

      pcRef.current = null;
    } else if (dcRef.current) {
      // Handle case where data channel exists but peer connection doesn't
      dcRef.current.close();
      dcRef.current = null;
    }

    // Stop the audio element
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.srcObject = null;
    }
    elevenLabsSink.stop();

    // Reset data channel state
    setDataChannel(null);

    // FINAL SAFEGUARD: Force close any remaining WebRTC connections

    if (typeof window !== 'undefined') {
    }

    if (typeof window !== 'undefined') {
      setTimeout(() => {
        if (window.gc) {
          window.gc();
        }

      }, 500);
    }

  };

  // Update ref so handleUserSpeech can access disconnectFromRealtime
  useEffect(() => {
    disconnectFromRealtimeRef.current = disconnectFromRealtime;
  }, [disconnectFromRealtime]);

  // Separate function for React Strict Mode cleanup
  const disconnectFromRealtimeReactCleanup = () => {
    console.log('Disconnecting from realtime... (React Strict Mode cleanup)');

    stopHeyGen();

    // Mark as intentionally disconnected to prevent auto-reconnection
    isIntentionallyDisconnectedRef.current = true;

    // Release connection lock immediately to prevent issues
    connectionLockRef.current = false;

    // DO NOT clear global connection state during React cleanup
    // Immediately clear the message handler to stop processing any new messages
    messageHandlerRef.current = null;

    // Reset states immediately to prevent any UI updates from queued messages
    setIsUserSpeaking(false);
    setIsAISpeaking(false);
    setSessionStatus("DISCONNECTED");
    setIsConnecting(false);
    hasConnectedRef.current = false;

    // FIRST: Immediately disable microphone tracks to stop any new audio capture
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        console.log('🛑 Disabling and stopping media track:', track.kind, 'ID:', track.id, 'State:', track.readyState);
        // Immediately disable the track to stop capture
        track.enabled = false;
        // Then stop it completely
        track.stop();
        console.log('🛑 Track stopped, new state:', track.readyState);
      });
      mediaStreamRef.current = null;
    } else {
      console.log('⚠️ No mediaStreamRef.current to stop!');
    }

    // AGGRESSIVE CLEANUP: Force stop ALL active media tracks globally
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
    }

    if (pcRef.current) {
      // STEP 1: Remove all tracks from the peer connection to stop transmission
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.enabled = false;
          sender.track.stop();
          pcRef.current!.removeTrack(sender);
        }
      });

      // STEP 2: Stop all transceivers to halt media negotiation
      pcRef.current.getTransceivers().forEach((transceiver) => {
        if (transceiver.direction !== 'inactive') {
          console.log('🛑 Stopping transceiver:', transceiver.direction);
          transceiver.stop();
        }
      });

      // STEP 3: Stop all receiver tracks
      pcRef.current.getReceivers().forEach((receiver) => {
        if (receiver.track) {
          receiver.track.stop();
        }
      });

      // STEP 4: Properly handle data channel closure with state monitoring
      if (dcRef.current) {
        const originalDc = dcRef.current;

        // Remove the specific message handler we stored
        if ((originalDc as any)._messageHandler) {
          originalDc.removeEventListener("message", (originalDc as any)._messageHandler);
        }

        // Try to remove any other potential message handlers by cloning and replacing
        // This is a more aggressive approach to ensure no listeners remain
        try {
          const events = ['message', 'open', 'close', 'error'];
          events.forEach(eventType => {
            // Create a dummy handler and remove it to clear any lingering listeners
            const dummyHandler = () => { };
            originalDc.addEventListener(eventType, dummyHandler);
            originalDc.removeEventListener(eventType, dummyHandler);
          });
        } catch (e) {
        }

        // Add a one-time listener for the close event
        const closeHandler = () => {
          console.log('✅ Data channel actually closed - state:', originalDc.readyState);
          console.log('✅ Timestamp of close:', new Date().toISOString());
          originalDc.removeEventListener('close', closeHandler);
        };
        originalDc.addEventListener('close', closeHandler);

        // Nullify our reference immediately to prevent new usage
        dcRef.current = null;

        // Close the data channel
        originalDc.close();

        // Force stop any remaining message processing by overriding ALL message handlers
        originalDc.onmessage = null;
        originalDc.onopen = null;
        originalDc.onclose = null;
        originalDc.onerror = null;

      }

      // STEP 5: Monitor connection state during close

      // Add a listener to verify the connection actually closes
      const connectionCloseHandler = () => {
      };
      pcRef.current.addEventListener('connectionstatechange', connectionCloseHandler);

      // STEP 6: Finally close the peer connection
      pcRef.current.close();


      pcRef.current = null;
    } else if (dcRef.current) {
      // Handle case where data channel exists but peer connection doesn't
      dcRef.current.close();
      dcRef.current = null;
    }

    // Stop the audio element
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.srcObject = null;
    }
    elevenLabsSink.stop();

    // Reset data channel state
    setDataChannel(null);

    // FINAL SAFEGUARD: Force close any remaining WebRTC connections
    console.log('🔧 Performing final cleanup of any remaining connections');

    // Get all RTCPeerConnection objects globally (if any are still active)
    if (typeof window !== 'undefined') {
      // This is a brute force approach to ensure no connections remain
      setTimeout(() => {
        console.log('🔍 Checking for any remaining active connections after disconnect...');
        if (hasConnectedRef.current === false && isIntentionallyDisconnectedRef.current === true) {
          console.log('✅ Disconnect confirmed - no reconnection detected');
        } else {
          console.warn('⚠️ Unexpected connection state after disconnect');
        }
      }, 2000);
    }

    // FINAL NUCLEAR OPTION: Try to stop ALL possible media streams
    console.log('☢️ NUCLEAR CLEANUP: Attempting to stop all possible media streams...');
    if (typeof window !== 'undefined') {
      // Try to access the global media stream registry (if available)
      setTimeout(() => {
        // Force garbage collection of any lingering streams
        if (window.gc) {
          window.gc();
          console.log('🗑️ Forced garbage collection');
        }

        // Check browser media indicator after cleanup
        console.log('🔍 Media cleanup complete. Browser should no longer show microphone indicator.');
        console.log('📊 Final state check:');
        console.log('   - hasConnectedRef:', hasConnectedRef.current);
        console.log('   - isIntentionallyDisconnectedRef:', isIntentionallyDisconnectedRef.current);
        console.log('   - sessionStatus:', sessionStatus);
      }, 500);
    }

    console.log('✅ Successfully disconnected from realtime - all audio capture and processing stopped');
  };

  const sendSessionKickoff = () => {
    const mode: SessionMode =
      sessionModeProp ?? sessionAvatarRef.current.sessionMode ?? 'teaching';
    const slideIndex = currentSlideRef.current;
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
    sendClientEvent({ type: "response.create" });
  };

  const initializeSession = () => {
    const mode: SessionMode =
      sessionModeProp ?? sessionAvatarRef.current.sessionMode ?? 'teaching';
    const slideIndex = currentSlideRef.current;
    const publisherInstructions = parsePublisherInstructions(
      classSession.classDetails.assistant_parameters?.instructions,
    );

    console.log("🔧 Initializing session with AI-led slide navigation...", { mode, slideIndex });

    const voiceProvider = sessionAvatarRef.current.voiceProvider ?? "openai";
    if (voiceProvider === "elevenlabs") {
      console.log("🔊 Voice engine: ElevenLabs (OpenAI Realtime running text-only)", {
        voiceId: sessionAvatarRef.current.voiceId,
        dialect: sessionAvatarRef.current.voiceDialect,
      });
    } else {
      console.log("🔊 Voice engine: OpenAI Realtime audio", {
        voice: sessionAvatarRef.current.voiceId ?? pickRealtimeVoiceForAvatar(sessionAvatarRef.current),
      });
    }
    // ElevenLabs branch: OpenAI still does STT + reasoning, but must not also
    // synthesize audio — that's what the ElevenLabs AudioSink is for. GA
    // field name mirrors the `response.modalities` shape this file already
    // sends for the slide-change-interrupt response.create call; if a future
    // OpenAI Realtime GA revision renames this, this is the one place to fix.
    const voiceSessionFields =
      voiceProvider === "elevenlabs"
        ? { modalities: ["text"] }
        : {
            audio: {
              output: {
                voice:
                  sessionAvatarRef.current.voiceId ??
                  pickRealtimeVoiceForAvatar(sessionAvatarRef.current),
              },
            },
          };

    const sessionUpdate = {
      type: "session.update",
      session: {
        tool_choice: "auto",
        ...voiceSessionFields,
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

    awaitingSessionConfigRef.current = true;
    window.setTimeout(() => {
      if (awaitingSessionConfigRef.current) {
        awaitingSessionConfigRef.current = false;
        sendSessionKickoff();
      }
    }, 700);
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    if (audioElementRef.current) {
      audioElementRef.current.muted = isAudioEnabled; // Note: isAudioEnabled is the current state, so we want the opposite
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

    setTextInput("");
    setShowStartPrompt(false);
    setIsTranscriptVisible(true);
    setTranscript((prev) => [...prev, { id: createTranscriptId(), role: "user", text: clean }]);
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
    sendClientEvent({ type: "response.create" }, "text_input.response");
  };

  const nextSlide = () => {
    applySlideNavigation(currentSlideRef.current + 1, "manual_navigation");
  };

  const previousSlide = () => {
    applySlideNavigation(currentSlideRef.current - 1, "manual_navigation");
  };

  const handleEndSessionClick = () => {
    setShowFeedbackModal(true);
  };

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

      // Call the original onEndSession with metadata
      if (typeof onEndSession === 'function') {
        await onEndSession(sessionRunMetadata);
      }

      setShowFeedbackModal(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Still close modal and end session even if feedback fails
      setShowFeedbackModal(false);
      if (typeof onEndSession === 'function') {
        onEndSession({ ended_by_user: true });
      }
    }
  };

  const handleSkipFeedback = () => {
    setShowFeedbackModal(false);
    if (typeof onEndSession === 'function') {
      onEndSession({ ended_by_user: true });
    }
  };

  const handleFeedbackChange = (field: string, value: string | number) => {
    setFeedbackData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const notifyLearnerManualSlideChange = useCallback(
    (slideIndex: number, action: LearnerSlideChangeAction) => {
      const slide = classSession.slides[slideIndex];
      const title = slide?.title ?? `Slide ${slideIndex + 1}`;

      if (dcRef.current?.readyState !== "open") {
        toast.info(`Moved to "${title}". Start the session so the tutor can teach this slide.`);
        return;
      }

      const mode: SessionMode =
        sessionModeProp ?? sessionAvatarRef.current.sessionMode ?? "teaching";
      const publisherInstructions = parsePublisherInstructions(
        classSession.classDetails.assistant_parameters?.instructions,
      );

      notifyLearnerSlideChangeToRealtime({
        send: (event, suffix) => sendClientEventRef.current(event, suffix),
        slides: classSession.slides,
        slideIndex,
        action,
        sessionMode: mode,
        publisherInstructions,
      });

      setTranscript((prev) => [
        ...prev,
        {
          id: createTranscriptId(),
          role: "user",
          text: `[You moved to slide ${slideIndex + 1}: ${title}]`,
        },
      ]);
      toast.success(`Teaching slide ${slideIndex + 1}: ${title}`);
      console.log(`📤 Learner slide change → teaching slide ${slideIndex + 1}`);
    },
    [
      classSession.slides,
      classSession.classDetails.assistant_parameters?.instructions,
      sessionModeProp,
    ],
  );

  const notifyLearnerManualSlideChangeRef = useRef(notifyLearnerManualSlideChange);
  useEffect(() => {
    notifyLearnerManualSlideChangeRef.current = notifyLearnerManualSlideChange;
  }, [notifyLearnerManualSlideChange]);

  const pushSlideContextUpdate = useCallback((slideIndex: number) => {
    const mode: SessionMode =
      sessionModeProp ?? sessionAvatarRef.current.sessionMode ?? 'teaching';
    const publisherInstructions = parsePublisherInstructions(
      classSession.classDetails.assistant_parameters?.instructions,
    );

    sendClientEvent({
      type: "session.update",
      session: {
        instructions: buildAiLeadSystemPrompt({
          slides: classSession.slides,
          sessionMode: mode,
          currentSlideIndex: slideIndex,
          publisherInstructions,
        }),
      },
    }, "slide.context_update");
  }, [classSession.classDetails.assistant_parameters?.instructions, classSession.slides, sessionModeProp]);

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
      setShowStartPrompt(false);
      const action: LearnerSlideChangeAction =
        source === "manual_navigation"
          ? targetIndex > previousIndex
            ? "next"
            : "previous"
          : "jump";
      notifyLearnerManualSlideChangeRef.current(result.currentIndex, action);
    }

    return result;
  }, [slideCount]);

  const performAiSlideAdvance = useCallback(
    (targetIndex: number): SlideNavigationResult => {
      const result = applySlideNavigation(targetIndex, "ai_tool");
      if (result.success) {
        slideToolHandledThisTurnRef.current = true;
        pushSlideContextUpdate(result.currentIndex);
        console.log(`📽️ Slide advanced to ${result.currentIndex + 1}`);
      }
      return result;
    },
    [applySlideNavigation, pushSlideContextUpdate],
  );

  const handleRealtimeSlideTool = useCallback(
    (toolName: RealtimeSlideToolName, args: Record<string, unknown>) => {
      if (!aiLeadEnabled) {
        return {
          success: false,
          message: "Learner has slide control",
          data: {},
        };
      }

      const target = resolveSlideToolTarget(
        toolName,
        args,
        currentSlideRef.current,
        slideCount,
      );
      if (target === null) return null;

      const result = performAiSlideAdvance(target);
      return buildRealtimeSlideToolResponse(
        toolName,
        result,
        classSession.slides,
        target,
      );
    },
    [aiLeadEnabled, classSession.slides, performAiSlideAdvance, slideCount],
  );

  useEffect(() => {
    performAiSlideAdvanceRef.current = performAiSlideAdvance;
    onSlideToolRef.current = handleRealtimeSlideTool;
    handleRealtimeSlideToolRef.current = handleRealtimeSlideTool;
  }, [performAiSlideAdvance, handleRealtimeSlideTool]);

  const goToSlideByIndex = (targetIndex: number) => {
    applySlideNavigation(targetIndex, "dot_navigation");
  };

  // Reset transcript content when a new session run starts
  useEffect(() => {
    setTranscript([]);
  }, [sessionRunId]);

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
          notifyLearnerManualSlideChangeRef.current(correctSlide, "jump");
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

      if (serverEvent.type === "session.updated" && awaitingSessionConfigRef.current) {
        awaitingSessionConfigRef.current = false;
        sendSessionKickoff();
      }

      const voiceProvider = sessionAvatarRef.current.voiceProvider ?? "openai";

      // --- Track voice activity ---
      if (serverEvent.type === "input_audio_buffer.speech_started") {
        setIsUserSpeaking(true);
        // Barge-in: OpenAI's server_vad auto-cancels/truncates its own
        // in-flight audio response, but that has no effect on ElevenLabs
        // audio we've already queued/are playing — stop it ourselves.
        if (voiceProvider === "elevenlabs") {
          elevenLabsSink.stop();
          elevenLabsTurnTextRef.current = "";
          elevenLabsPendingClauseRef.current = "";
          sendClientEvent({ type: "response.cancel" });
        }
      } else if (serverEvent.type === "input_audio_buffer.speech_stopped") {
        setIsUserSpeaking(false);
      }
      if (serverEvent.type === "output_audio_buffer.started") {
        slideToolHandledThisTurnRef.current = false;
        setIsAISpeaking(true);
      } else if (serverEvent.type === "output_audio_buffer.stopped") {
        setIsAISpeaking(false);
      }

      // --- ElevenLabs branch: OpenAI is text-only, so assistant speech comes
      // from text deltas instead of the audio-transcript events below. GA
      // gpt-realtime models are expected to emit "response.output_text.delta";
      // dual-listen for "response.text.delta" the same way the audio-transcript
      // events do, in case of a preview/GA naming difference. ---
      if (
        voiceProvider === "elevenlabs" &&
        (serverEvent.type === "response.output_text.delta" ||
          serverEvent.type === "response.text.delta")
      ) {
        if (!elevenLabsTurnTextRef.current && !elevenLabsPendingClauseRef.current) {
          slideToolHandledThisTurnRef.current = false;
        }
        const deltaText = serverEvent.delta || "";
        elevenLabsTurnTextRef.current += deltaText;
        elevenLabsPendingClauseRef.current += deltaText;

        const pending = elevenLabsPendingClauseRef.current;
        const endsClause = /[.!?][")'\]]?\s*$/.test(pending) || pending.endsWith("\n");
        const wordCount = pending.trim().split(/\s+/).filter(Boolean).length;
        if (pending.trim() && (endsClause || wordCount >= 40)) {
          elevenLabsSink.push(pending);
          elevenLabsPendingClauseRef.current = "";
        }
      }

      if (voiceProvider === "elevenlabs" && serverEvent.type === "response.done") {
        const remainingClause = elevenLabsPendingClauseRef.current;
        if (remainingClause.trim()) {
          elevenLabsSink.push(remainingClause);
        }
        const fullTurnText = elevenLabsTurnTextRef.current;
        if (fullTurnText.trim()) {
          setTranscript((prev) => [
            ...prev,
            { id: createTranscriptId(), role: "assistant", text: fullTurnText },
          ]);
          if (heygenAvatarRef.current) {
            heygenAvatarRef.current
              .speak({ text: fullTurnText, taskType: TaskType.REPEAT })
              .catch(() => { });
          }
          if (!slideToolHandledThisTurnRef.current && aiLeadEnabled) {
            const target = detectSlideAdvanceFromSpeech(
              fullTurnText,
              currentSlideRef.current,
              slideCount,
            );
            if (target !== null) {
              performAiSlideAdvanceRef.current(target);
            }
          }
        }
        elevenLabsTurnTextRef.current = "";
        elevenLabsPendingClauseRef.current = "";
      }

      // --- Feed AI text to HeyGen visual layer (§4.2 SYSTEM_DESIGN) ---
      // Fires when a full assistant turn completes. GA gpt-realtime models emit
      // "response.output_audio_transcript.done"; older preview models used
      // "response.audio_transcript.done" — accept both so this keeps working
      // across model generations.
      if (
        (serverEvent.type === "response.output_audio_transcript.done" ||
          serverEvent.type === "response.audio_transcript.done") &&
        serverEvent.transcript
      ) {
        setTranscript((prev) => [
          ...prev,
          { id: createTranscriptId(), role: "assistant", text: serverEvent.transcript },
        ]);
        if (heygenAvatarRef.current) {
          heygenAvatarRef.current
            .speak({ text: serverEvent.transcript, taskType: TaskType.REPEAT })
            .catch(() => { });
        }

        if (!slideToolHandledThisTurnRef.current && aiLeadEnabled) {
          const target = detectSlideAdvanceFromSpeech(
            serverEvent.transcript,
            currentSlideRef.current,
            slideCount,
          );
          if (target !== null) {
            console.log(`📽️ Verbal slide advance detected → slide ${target + 1}`);
            performAiSlideAdvanceRef.current(target);
          }
        }
      }

      // --- Guard phrases: intercept intentional interruptions ---
      // Fix 2: "transcript.final" does not exist in the Realtime API; use the correct event.
      if (serverEvent.type === "conversation.item.input_audio_transcription.completed") {
        const recognizedText = serverEvent.transcript || "";
        if (recognizedText) {
          setTranscript((prev) => [
            ...prev,
            { id: createTranscriptId(), role: "user", text: recognizedText },
          ]);
          clearTimeout((window as any)._speechHandleTimer);
          (window as any)._speechHandleTimer = setTimeout(() => {
            // confidence and duration are not available on this event; pass safe defaults
            handleUserSpeech(recognizedText, 1.0, recognizedText.split(" ").length * 0.3);
          }, 400);
        }
      }

      // --- Handle tool calls for slide navigation ---
      const toolCallItems = extractRealtimeToolCalls(serverEvent);

      if (toolCallItems.length > 0) {
        let pendingAsync = 0;
        let submittedToolOutputs = 0;

        toolCallItems.forEach((outputItem) => {
          const callId = outputItem.call_id;
          if (callId) {
            if (handledRealtimeToolCallIdsRef.current.has(callId)) {
              return;
            }
            handledRealtimeToolCallIdsRef.current.add(callId);
          }

          let args: Record<string, unknown> = {};
          try {
            args = outputItem.arguments ? JSON.parse(outputItem.arguments) : {};
          } catch {
            args = {};
          }

          if (outputItem.name === "searchKnowledgeBase") {
            pendingAsync += 1;
            const query = args.query;
            fetch(config.getApiUrl(`/api/sessions/${classSession.sessionId}/search`), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ query, course_id: undefined }),
            })
              .then((res) => res.json())
              .then((data) => {
                sendClientEvent({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: outputItem.call_id,
                    output: JSON.stringify({
                      success: true,
                      message: `Found ${(data.results || []).length} chunks of knowledge`,
                      data: data.results || [],
                    }),
                  },
                });
              })
              .catch(() => {
                sendClientEvent({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: outputItem.call_id,
                    output: JSON.stringify({
                      success: false,
                      message: "Error searching knowledge base",
                    }),
                  },
                });
              })
              .finally(() => {
                pendingAsync -= 1;
                if (pendingAsync === 0) {
                  sendClientEvent({ type: "response.create" });
                }
              });
            return;
          }

          const functionResult = outputItem.name && isRealtimeSlideTool(outputItem.name)
            ? handleRealtimeSlideToolRef.current?.(outputItem.name, args)
            : null;

          if (!functionResult) {
            return;
          }

          submittedToolOutputs += 1;
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

        if (pendingAsync === 0 && submittedToolOutputs > 0) {
          sendClientEvent({ type: "response.create" });
        }
        return;
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
      {/* ── Header ── */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 md:px-6 z-10 shadow-sm relative">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-foreground leading-none">
              {classSession.classDetails.className}
            </h1>
            <p className="truncate text-xs text-muted-foreground mt-1">
              {classSession.classDetails.courseName} — {classSession.classDetails.courseCode}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden sm:flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            AI Tutor Session
          </span>
        </div>
      </header>


      {/* ── Main Layout ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        {/* ── Left Sidebar: Avatar & Controls ── */}
        <div className="flex h-[46vh] min-h-[260px] w-full shrink-0 flex-col overflow-hidden border-b border-sidebar-border bg-sidebar md:h-auto md:w-[280px] md:border-b-0 md:border-r lg:w-[320px]">
          {/* Avatar Video Area */}
          <div className="relative flex min-h-0 flex-1 flex-col items-center gap-2 bg-sidebar p-3">
            <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-sidebar-border bg-sidebar-accent shadow-xl pointer-events-none">
              <SessionAvatarRenderer
                config={sessionAvatar}
                audioElement={activeOutputAudioElement}
                isConnected={sessionStatus === "CONNECTED"}
                isAISpeaking={isAISpeaking}
                isUserSpeaking={isUserSpeaking}
                lipSyncAmplitude={lipSyncAmplitude}
                heygenConnected={sessionStatus === "CONNECTED" && !isConnecting}
                heygenVideoRef={heygenVideoRef}
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

            {/* Mic & Sound toggles */}
            <div className="flex gap-2">
              <button
                onClick={toggleMicrophone}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1.5 rounded-xl py-3 text-xs font-medium transition-colors border",
                  !isMicMuted ? "bg-sidebar-accent text-sidebar-foreground border-transparent hover:bg-sidebar-accent/80" : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                )}
              >
                {!isMicMuted ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                {!isMicMuted ? "Mic On" : "Mic Off"}
              </button>
              <button
                onClick={toggleAudio}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1.5 rounded-xl py-3 text-xs font-medium transition-colors border",
                  isAudioEnabled ? "bg-sidebar-accent text-sidebar-foreground border-transparent hover:bg-sidebar-accent/80" : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                )}
              >
                {isAudioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                {isAudioEnabled ? "Sound On" : "Sound Off"}
              </button>
              <button
                onClick={() => setIsTranscriptVisible(!isTranscriptVisible)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1.5 rounded-xl py-3 text-xs font-medium transition-colors border",
                  isTranscriptVisible ? "bg-primary/15 text-primary border-primary/30" : "bg-sidebar-accent text-sidebar-foreground border-transparent hover:bg-sidebar-accent/80"
                )}
                aria-pressed={isTranscriptVisible}
                aria-label={isTranscriptVisible ? "Hide transcript" : "Show transcript"}
                title={isTranscriptVisible ? "Hide transcript" : "Show transcript"}
              >
                <MessageSquare className={cn("h-4 w-4", isTranscriptVisible && "fill-primary/20")} />
                {isTranscriptVisible ? "Transcript On" : "Transcript"}
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
        <div className="relative flex min-h-[50vh] flex-1 flex-col overflow-hidden bg-muted/10 md:min-h-0">

          {/* Start Conversation Prompt overlay */}
          {showStartPrompt && (
            <div className="absolute top-4 left-1/2 z-40 w-[92vw] max-w-sm -translate-x-1/2 animate-in fade-in slide-in-from-top-4 duration-500 sm:top-6 sm:w-auto">
              <div className={cn(
                "px-4 py-3 sm:px-6 sm:py-4 rounded-2xl shadow-xl flex items-center gap-3 sm:gap-4 border backdrop-blur-md transition-all duration-300",
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
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-card px-2 py-3 sm:px-4 md:px-6">
            <button
              type="button"
              onClick={previousSlide}
              disabled={currentSlide === 0}
              className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="flex min-w-0 max-w-[45vw] flex-col items-center sm:max-w-none">
              <span className="w-full truncate text-center text-sm font-semibold text-foreground">{currentSlideData?.title || `Slide ${currentSlide + 1}`}</span>
              <span className="mt-0.5 text-xs text-muted-foreground">
                {currentSlide + 1} / {slideCount}
              </span>
              {aiLeadEnabled && (
                <span className="mt-0.5 hidden text-[10px] font-medium uppercase tracking-wide text-primary sm:block">
                  AI leading · use Next when ready
                </span>
              )}
              <div className="mt-1 flex max-w-full flex-wrap items-center justify-center gap-1.5">
                {Array.from({ length: slideCount }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToSlideByIndex(i)}
                    className={cn(
                      "rounded-full transition-all duration-300",
                      i === currentSlide ? "h-2 w-6 bg-primary" : "h-2 w-2 bg-border hover:bg-muted-foreground"
                    )}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={nextSlide}
              disabled={currentSlide === slideCount - 1}
              className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>


        </div>

        {/* ── Right Sidebar: Transcript ── */}
        <TranscriptPanel
          messages={transcript}
          isVisible={isTranscriptVisible}
          onClose={() => setIsTranscriptVisible(false)}
          onClear={() => setTranscript([])}
        />
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
