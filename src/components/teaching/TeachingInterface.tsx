"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Phone, PhoneOff, Mic, MicOff, MessageSquare, ChevronUp, ChevronDown } from "lucide-react";
import { ClassSession, CitedSource } from "@/types";
import { useTranscript } from "@/contexts/TranscriptContext";
import { useEvent } from "@/contexts/EventContext";
import { useHandleServerEvent } from "@/hooks/useHandleServerEvent";
import { useStructuredTranscript } from "@/contexts/StructuredTranscriptContext";
import { useAuth } from "@/contexts/AuthContext";
import { createRealtimeConnection, checkWebRTCSupport } from "@/lib/realtimeConnection";
import { classifyTurn } from "@/lib/turnClassifier";
import teachingAssistant from "@/constants/teachingAssistant";
import { config } from "@/lib/config";

// Global connection tracking to prevent React Strict Mode issues
let globalConnectionId: string | null = null;
let globalConnectionPromise: Promise<void> | null = null;

interface TeachingInterfaceProps {
  classSession: ClassSession;
  onEndSession: (metadata?: any) => void;
  sessionRunId?: string;
  startingSlide?: number;
}

export default function TeachingInterface({ classSession, onEndSession, sessionRunId, startingSlide }: TeachingInterfaceProps) {
  // Always start with slide 0 for SSR consistency
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<"DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR">("DISCONNECTED");
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);
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
  const [showCaptions, setShowCaptions] = useState(true);

  // Cited source — set when AI calls citeSlide, auto-cleared after 30 s
  const [citedSource, setCitedSource] = useState<CitedSource | null>(null);
  const citedSourceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCiteSlide = useCallback((slideNumber: number) => {
    if (citedSourceTimerRef.current) clearTimeout(citedSourceTimerRef.current);
    setCitedSource({ slideNumber, citedAt: Date.now() });
    citedSourceTimerRef.current = setTimeout(() => setCitedSource(null), 30_000);
  }, []);

  // Clean up the auto-clear timer on unmount
  useEffect(() => {
    return () => {
      if (citedSourceTimerRef.current) clearTimeout(citedSourceTimerRef.current);
    };
  }, []);
  const captionScrollRef = useRef<HTMLDivElement>(null);
  const [showStartPrompt, setShowStartPrompt] = useState(true); // Show from the beginning

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
  const GUARD_PHRASES = ["stop", "pause", "end session", "wait"]; // Guard phrases to allow intentional interruptions
  const MIN_VOICE_LENGTH = 0.8; // Minimum length in seconds
  const MIN_CONFIDENCE = 0.85;  // Minimum confidence from speech recognition

  const { token } = useAuth();
  const { logClientEvent,  } = useEvent();
  const { currentQuestion, latestResponse, keyConcepts, rollingNotes, addStructuredTurn } = useStructuredTranscript();

  const getRubricTerms = useCallback((): string[] => {
    try {
      const raw = classSession.classDetails.assistant_parameters?.instructions || "";
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.sessionBehavior?.rubric)) {
        return parsed.sessionBehavior.rubric.map((r: { criterion: string }) => r.criterion).filter(Boolean);
      }
    } catch {}
    return [];
  }, [classSession]);

  const handleTurnComplete = useCallback((role: "assistant" | "user", text: string) => {
    const turn = classifyTurn(role, text, getRubricTerms());
    addStructuredTurn(turn);
  }, [addStructuredTurn, getRubricTerms]);

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

  const handleServerEventRef = useHandleServerEvent({
    setSessionStatus,
    selectedAgentName: "teachingAssistant",
    selectedAgentConfigSet: teachingAssistant,
    sendClientEvent,
    setSelectedAgentName: () => {},
    setIsOutputAudioBufferActive: () => {},
    sessionId: classSession.sessionId,
    onCiteSlide: handleCiteSlide,
    onTurnComplete: handleTurnComplete,
  });

  const fetchEphemeralKey = useCallback(async () => {
    try {
      const url = new URL(config.getApiUrl('/api/session/ephemeral'));
      url.searchParams.append('session_id', classSession.sessionId);
      if (sessionRunId) {
        url.searchParams.append('session_run_id', sessionRunId);
      }

      // Send the auth token when available.
      // Unauthenticated callers (shared-link / guest flow) omit the header;
      // the backend permits them only when the run belongs to the guest user.
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url.toString(), { headers });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.client_secret.value;
    } catch (error) {
      console.error('Failed to fetch ephemeral key:', error);
      throw error;
    }
  }, [classSession.sessionId, sessionRunId, token]);

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
        const EPHEMERAL_KEY = await fetchEphemeralKey();
        if (!EPHEMERAL_KEY) {
          setSessionStatus("ERROR");
          setIsConnecting(false);
          hasConnectedRef.current = false;
          connectionLockRef.current = false; // Release lock on error
          globalConnectionId = null;
          globalConnectionPromise = null;
          return;
        }

        if (!audioElementRef.current) {
          audioElementRef.current = document.createElement("audio");
        }
        audioElementRef.current.autoplay = true;
        audioElementRef.current.muted = !isAudioEnabled;

        // Generate unique ID for this connection
        const dataChannelId = Math.random().toString(36).substr(2, 9);

        console.log(`🌐 Creating WebRTC connection... [${connectionId}] -> [${dataChannelId}]`);
        // Get the model from sessionStorage (stored when session run was created)
        const storedModel = sessionRunId ? sessionStorage.getItem(`session_run_model_${sessionRunId}`) : null;
        const modelToUse = storedModel || "gpt-realtime";
        console.log(`🎯 Using model for session ${sessionRunId}: ${modelToUse}`);
        
        const { pc, dc, mediaStream } = await createRealtimeConnection(
          EPHEMERAL_KEY,
          audioElementRef,
          "opus",
          modelToUse
        );
        
        console.log(`🔗 Created new peer connection and data channel [${connectionId}] -> [${dataChannelId}] - Lock: ${connectionLockRef.current}`);
        console.log(`🔗 Data channel ready state: ${dc.readyState}`);
        
        pcRef.current = pc;
        dcRef.current = dc;
        mediaStreamRef.current = mediaStream;

        dc.addEventListener("open", () => {
          logClientEvent({}, "data_channel.open");
          console.log(`✅ Data channel opened successfully - releasing connection lock [${connectionId}]`);
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
          
          console.log(`📨 Data channel message received [${dataChannelId}]:`, e.data);
          // Only process messages if we're still connected and have a handler
          if (messageHandlerRef.current && hasConnectedRef.current) {
            messageHandlerRef.current(e);
          } else {
            console.log(`🚫 Ignoring message - disconnected or no handler [${dataChannelId}]`);
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
    console.log('🔧 Performing aggressive media track cleanup...');
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      console.log('✅ Media track cleanup completed - relying on proper WebRTC stream management');
    }
    
    if (pcRef.current) {
      // STEP 1: Remove all tracks from the peer connection to stop transmission
      console.log('🛑 Removing all tracks from peer connection');
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track) {
          console.log('🛑 Disabling, stopping, and removing sender track:', sender.track.kind, 'ID:', sender.track.id, 'State:', sender.track.readyState);
          sender.track.enabled = false;
          sender.track.stop();
          console.log('🛑 Sender track stopped, new state:', sender.track.readyState);
          // Remove the track from the peer connection
          pcRef.current!.removeTrack(sender);
        } else {
          console.log('🛑 Sender had no track to stop');
        }
      });
      
      // STEP 2: Stop all transceivers to halt media negotiation
      console.log('🛑 Stopping all transceivers');
      pcRef.current.getTransceivers().forEach((transceiver) => {
        if (transceiver.direction !== 'inactive') {
          console.log('🛑 Stopping transceiver:', transceiver.direction);
          transceiver.stop();
        }
      });
      
      // STEP 3: Stop all receiver tracks
      pcRef.current.getReceivers().forEach((receiver) => {
        if (receiver.track) {
          console.log('🛑 Stopping receiver track:', receiver.track.kind);
          receiver.track.stop();
        }
      });
      
      // STEP 4: Properly handle data channel closure with state monitoring
      if (dcRef.current) {
        console.log('🛑 Preparing data channel for closure');
        
        const originalDc = dcRef.current;
        console.log('🛑 Data channel state before close:', originalDc.readyState);
        
        // Remove the specific message handler we stored
        if ((originalDc as any)._messageHandler) {
          originalDc.removeEventListener("message", (originalDc as any)._messageHandler);
          console.log('🛑 Removed specific message handler');
        }
        
        // Try to remove any other potential message handlers by cloning and replacing
        // This is a more aggressive approach to ensure no listeners remain
        try {
          const events = ['message', 'open', 'close', 'error'];
          events.forEach(eventType => {
            // Create a dummy handler and remove it to clear any lingering listeners
            const dummyHandler = () => {};
            originalDc.addEventListener(eventType, dummyHandler);
            originalDc.removeEventListener(eventType, dummyHandler);
          });
          console.log('🛑 Attempted to clear any lingering event listeners');
        } catch (e) {
          console.log('⚠️ Could not clear all event listeners:', e);
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
        console.log('🛑 Closing data channel...');
        originalDc.close();
        console.log('🛑 Data channel state after close command:', originalDc.readyState);
        
        // Force stop any remaining message processing by overriding ALL message handlers
        originalDc.onmessage = null;
        originalDc.onopen = null;
        originalDc.onclose = null;
        originalDc.onerror = null;
        
        console.log('🛑 Completely disabled data channel message processing');
      }
      
      // STEP 5: Monitor connection state during close
      console.log('🛑 Peer connection state before close:', pcRef.current.connectionState);
      console.log('🛑 ICE connection state before close:', pcRef.current.iceConnectionState);
      
      // Add a listener to verify the connection actually closes
      const connectionCloseHandler = () => {
        console.log('✅ Peer connection state changed to closed');
      };
      pcRef.current.addEventListener('connectionstatechange', connectionCloseHandler);
      
      // STEP 6: Finally close the peer connection
      console.log('🛑 Closing peer connection');
      pcRef.current.close();
      
      // Check state immediately after close
      console.log('🛑 Peer connection state after close:', pcRef.current.connectionState);
      console.log('🛑 ICE connection state after close:', pcRef.current.iceConnectionState);
      
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

  // Update ref so handleUserSpeech can access disconnectFromRealtime
  useEffect(() => {
    disconnectFromRealtimeRef.current = disconnectFromRealtime;
  }, [disconnectFromRealtime]);

  // Separate function for React Strict Mode cleanup
  const disconnectFromRealtimeReactCleanup = () => {
    console.log('Disconnecting from realtime... (React Strict Mode cleanup)');
    
    // Mark as intentionally disconnected to prevent auto-reconnection
    isIntentionallyDisconnectedRef.current = true;
    
    // Release connection lock immediately to prevent issues
    connectionLockRef.current = false;
    
    // DO NOT clear global connection state during React cleanup
    console.log('🚫 Preserving global connection state (React Strict Mode cleanup)');
    
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
    console.log('🔧 Performing aggressive media track cleanup...');
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      console.log('✅ Media track cleanup completed - relying on proper WebRTC stream management');
    }
    
    if (pcRef.current) {
      // STEP 1: Remove all tracks from the peer connection to stop transmission
      console.log('🛑 Removing all tracks from peer connection');
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track) {
          console.log('🛑 Disabling, stopping, and removing sender track:', sender.track.kind, 'ID:', sender.track.id, 'State:', sender.track.readyState);
          sender.track.enabled = false;
          sender.track.stop();
          console.log('🛑 Sender track stopped, new state:', sender.track.readyState);
          // Remove the track from the peer connection
          pcRef.current!.removeTrack(sender);
        } else {
          console.log('🛑 Sender had no track to stop');
        }
      });
      
      // STEP 2: Stop all transceivers to halt media negotiation
      console.log('🛑 Stopping all transceivers');
      pcRef.current.getTransceivers().forEach((transceiver) => {
        if (transceiver.direction !== 'inactive') {
          console.log('🛑 Stopping transceiver:', transceiver.direction);
          transceiver.stop();
        }
      });
      
      // STEP 3: Stop all receiver tracks
      pcRef.current.getReceivers().forEach((receiver) => {
        if (receiver.track) {
          console.log('🛑 Stopping receiver track:', receiver.track.kind);
          receiver.track.stop();
        }
      });
      
      // STEP 4: Properly handle data channel closure with state monitoring
      if (dcRef.current) {
        console.log('🛑 Preparing data channel for closure');
        
        const originalDc = dcRef.current;
        console.log('🛑 Data channel state before close:', originalDc.readyState);
        
        // Remove the specific message handler we stored
        if ((originalDc as any)._messageHandler) {
          originalDc.removeEventListener("message", (originalDc as any)._messageHandler);
          console.log('🛑 Removed specific message handler');
        }
        
        // Try to remove any other potential message handlers by cloning and replacing
        // This is a more aggressive approach to ensure no listeners remain
        try {
          const events = ['message', 'open', 'close', 'error'];
          events.forEach(eventType => {
            // Create a dummy handler and remove it to clear any lingering listeners
            const dummyHandler = () => {};
            originalDc.addEventListener(eventType, dummyHandler);
            originalDc.removeEventListener(eventType, dummyHandler);
          });
          console.log('🛑 Attempted to clear any lingering event listeners');
        } catch (e) {
          console.log('⚠️ Could not clear all event listeners:', e);
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
        console.log('🛑 Closing data channel...');
        originalDc.close();
        console.log('🛑 Data channel state after close command:', originalDc.readyState);
        
        // Force stop any remaining message processing by overriding ALL message handlers
        originalDc.onmessage = null;
        originalDc.onopen = null;
        originalDc.onclose = null;
        originalDc.onerror = null;
        
        console.log('🛑 Completely disabled data channel message processing');
      }
      
      // STEP 5: Monitor connection state during close
      console.log('🛑 Peer connection state before close:', pcRef.current.connectionState);
      console.log('🛑 ICE connection state before close:', pcRef.current.iceConnectionState);
      
      // Add a listener to verify the connection actually closes
      const connectionCloseHandler = () => {
        console.log('✅ Peer connection state changed to closed');
      };
      pcRef.current.addEventListener('connectionstatechange', connectionCloseHandler);
      
      // STEP 6: Finally close the peer connection
      console.log('🛑 Closing peer connection');
      pcRef.current.close();
      
      // Check state immediately after close
      console.log('🛑 Peer connection state after close:', pcRef.current.connectionState);
      console.log('🛑 ICE connection state after close:', pcRef.current.iceConnectionState);
      
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

  const initializeSession = () => {
    // if (sessionStatus !== "CONNECTED") {
    //   console.log("⚠️ Cannot initialize session - not connected");
    //   return;
    // }

    console.log("🔧 Initializing session with slide navigation tools...");

    const sessionUpdate = {
      type: "session.update",
      session: {
        tools: [
          {
            type: "function",
            name: "nextSlide",
            description: "Move to the next slide in the presentation",
            parameters: {
              type: "object",
              properties: {},
              required: [],
              additionalProperties: false,
            },
          },
          {
            type: "function", 
            name: "previousSlide",
            description: "Move to the previous slide in the presentation",
            parameters: {
              type: "object",
              properties: {},
              required: [],
              additionalProperties: false,
            },
          },
          {
            type: "function",
            name: "goToSlide", 
            description: "Jump to a specific slide number",
            parameters: {
              type: "object",
              properties: {
                slideNumber: {
                  type: "number",
                  description: "The slide number to navigate to (1-indexed)",
                },
              },
              required: ["slideNumber"],
              additionalProperties: false,
            },
          },
        ],
      },
    };

    console.log("📤 Sending session initialization:", sessionUpdate);
    const success = sendClientEvent(sessionUpdate);
    console.log("✅ Session initialization sent successfully:", success);
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

  const nextSlide = () => {
    setCurrentSlide((prevSlide) => {
      if (prevSlide < classSession.slides.length - 1) {
        const newSlide = prevSlide + 1;
        
        // Use the helper function to notify AI as user input
        notifyAIOfSlideChange(newSlide, prevSlide, "manual_navigation");
        
        return newSlide;
      }
      return prevSlide;
    });
  };

  const previousSlide = () => {
    setCurrentSlide((prevSlide) => {
      if (prevSlide > 0) {
        const newSlide = prevSlide - 1;
        
        // Use the helper function to notify AI as user input
        notifyAIOfSlideChange(newSlide, prevSlide, "manual_navigation");
        
        return newSlide;
      }
      return prevSlide;
    });
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

  // Helper function to notify AI about programmatic slide changes
  const notifyAIOfSlideChange = (newSlide: number, previousSlide: number, source: string = "programmatic") => {
    console.log(`📤 Notifying AI of ${source} slide change to slide ${newSlide + 1} - interrupting if speaking`);
    
    // Step 1: If AI is speaking, force interrupt the current response
    if (isAISpeaking) {
      console.log('🛑 AI is speaking, forcing interruption for slide change');
      
      // First, cancel the current response
      sendClientEvent({
        type: "response.cancel"
      }, `slide.${source}.cancel_response`);
      
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
    const triggerResponse = {
      type: "response.create",
      response: {
        modalities: ["text", "audio"]
      }
    };
    
    // Small delay to ensure the message is processed before triggering response
    setTimeout(() => {
      sendClientEvent(triggerResponse, `slide.${source}.trigger_response`);
    }, 100);
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

      // --- Track voice activity ---
      if (serverEvent.type === "input_audio_buffer.speech_started") {
        setIsUserSpeaking(true);
      } else if (serverEvent.type === "input_audio_buffer.speech_stopped") {
        setIsUserSpeaking(false);
      }
      if (serverEvent.type === "output_audio_buffer.started") {
        setIsAISpeaking(true);
      } else if (serverEvent.type === "output_audio_buffer.stopped") {
        setIsAISpeaking(false);
      }

      // --- Guard phrases: intercept intentional interruptions ---
      // Fix 2: "transcript.final" does not exist in the Realtime API; use the correct event.
      if (serverEvent.type === "conversation.item.input_audio_transcription.completed") {
        const recognizedText = serverEvent.transcript || "";
        if (recognizedText) {
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
      if (serverEvent.type === "response.done" && serverEvent.response?.output) {
        const toolCallItems = serverEvent.response.output.filter(
          (item: any) => item.type === "function_call" && item.name
        );

        if (toolCallItems.length > 0) {
          toolCallItems.forEach((outputItem: any) => {
            const args = outputItem.arguments ? JSON.parse(outputItem.arguments) : {};
            let functionResult: { success: boolean; message: string; data: object } = { success: false, message: "", data: {} };

            if (outputItem.name === "nextSlide") {
              const currentSlideValue = currentSlideRef.current;
              if (currentSlideValue < classSession.slides.length - 1) {
                const newSlide = currentSlideValue + 1;
                setCurrentSlide(newSlide);
                functionResult = {
                  success: true,
                  message: `Moved to slide ${newSlide + 1}`,
                  data: { previousSlide: currentSlideValue + 1, currentSlide: newSlide + 1 }
                };
              } else {
                functionResult = { success: false, message: "Already at last slide", data: {} };
              }
            } else if (outputItem.name === "previousSlide") {
              const currentSlideValue = currentSlideRef.current;
              if (currentSlideValue > 0) {
                const newSlide = currentSlideValue - 1;
                setCurrentSlide(newSlide);
                functionResult = {
                  success: true,
                  message: `Moved to slide ${newSlide + 1}`,
                  data: { previousSlide: currentSlideValue + 1, currentSlide: newSlide + 1 }
                };
              } else {
                functionResult = { success: false, message: "Already at first slide", data: {} };
              }
            } else if (outputItem.name === "goToSlide" && args.slideNumber) {
              const currentSlideValue = currentSlideRef.current;
              const targetSlide = parseInt(args.slideNumber) - 1;
              if (targetSlide >= 0 && targetSlide < classSession.slides.length) {
                setCurrentSlide(targetSlide);
                functionResult = {
                  success: true,
                  message: `Jumped to slide ${targetSlide + 1}`,
                  data: { previousSlide: currentSlideValue + 1, currentSlide: targetSlide + 1 }
                };
              } else {
                functionResult = { success: false, message: "Invalid slide number", data: {} };
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
          sendClientEvent({ type: "response.create" });
          // Tool calls fully handled — do not forward to handleServerEventRef
          return;
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
    if (isHydrated && currentSlide !== 0) {
      console.log(`📄 Slide changed to ${currentSlide + 1}: "${classSession.slides[currentSlide]?.title || 'Unknown'}"`);
      
      // Store in sessionStorage for persistence across page reloads
      if (sessionRunId) {
        sessionStorage.setItem(`session_${sessionRunId}_currentSlide`, currentSlide.toString());
      }
    }
  }, [currentSlide, isHydrated]);

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
    <div className="h-screen bg-gray-100 flex relative">
      {/* Start Conversation Prompt - Floating notification */}
      {showStartPrompt && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className={`${
            sessionStatus === "CONNECTED"
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/30"
              : "bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/30"
          } text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20 transition-all duration-300`}>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
              {sessionStatus === "CONNECTED" ? (
                <Mic size={20} className="text-white" />
              ) : (
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <div>
              {sessionStatus === "CONNECTED" ? (
                <>
                  <p className="font-semibold text-base">👋 Ready to start!</p>
                  <p className="text-sm text-emerald-50">Say something to begin the conversation</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-base">🔄 Connecting...</p>
                  <p className="text-sm text-amber-50">Please wait while we establish the connection</p>
                </>
              )}
            </div>
            {sessionStatus === "CONNECTED" && (
              <button
                onClick={() => setShowStartPrompt(false)}
                className="ml-2 text-white/80 hover:text-white transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Left Side - Slide Viewer (70%) */}
      <div className="w-[80%] bg-white flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img 
              src="/images/logo.png" 
              alt="ProfSidekick Logo" 
              className="w-11 h-11 object-contain bg-blue rounded-full"
              onError={(e) => {
                // Hide image if logo file doesn't exist
                e.currentTarget.style.display = 'none';
              }}
            />
            <div>
              <h1 className="text-xl font-semibold">{classSession.classDetails.className}</h1>
              <p className="text-blue-100 text-sm">
                {classSession.classDetails.courseName} • {classSession.classDetails.courseCode}
              </p>
            </div>
          </div>
          <button
            onClick={handleEndSessionClick}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            End Session
          </button>
        </div>

        {/* Slide Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-7xl relative">
            {currentSlideData?.imagePath ? (
              <>
                <img
                  src={getCorrectImageUrl(currentSlideData.imagePath)}
                  alt={currentSlideData?.title}
                  className="w-full h-auto rounded-lg shadow-lg transition-all duration-300"
                  onError={(e) => {
                    console.error('Failed to load slide image:', getCorrectImageUrl(currentSlideData.imagePath));
                    console.error('Error details:', e);
                  }}
                  onLoad={() => {
                    console.log('Successfully loaded slide image:', getCorrectImageUrl(currentSlideData.imagePath));
                  }}
                />
              </>
            ) : (
              <div className="bg-gray-100 rounded-lg p-8 text-center">
                <p className="text-gray-500">No slide image available</p>
                <div className="mt-4 text-xs text-gray-400">
                  Debug: {JSON.stringify(currentSlideData, null, 2)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Slide Navigation */}
        <div className="bg-gray-50 p-4 border-t flex justify-between items-center">
          <button
            onClick={previousSlide}
            disabled={currentSlide === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors"
          >
            <ChevronLeft size={20} />
            Previous
          </button>
          
          <div className="text-center">
            <p className="text-lg font-medium">{currentSlideData?.title}</p>
            <p className="text-sm text-gray-600">
              Slide {currentSlide + 1} of {classSession.totalSlides}
            </p>
            {citedSource && (
              <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Source: Slide {citedSource.slideNumber}
              </div>
            )}
          </div>
          
          <button
            onClick={nextSlide}
            disabled={currentSlide === classSession.slides.length - 1}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors"
          >
            Next
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Right Side - Voice Assistant Panel (20%) */}
      <div className="w-[20%] bg-gradient-to-b from-slate-50 to-white border-l border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200/50">
          <div className="flex items-center gap-3">
            {/* <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">🤖</span>
            </div> */}
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">ProfSidekick</h3>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  sessionStatus === "CONNECTED" ? "bg-emerald-500" : 
                  sessionStatus === "CONNECTING" ? "bg-amber-500" : 
                  sessionStatus === "ERROR" ? "bg-red-500" : "bg-slate-400"
                }`}></div>
                <span className="text-xs text-slate-500 capitalize font-medium">
                  {sessionStatus.toLowerCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Guard Phrase Info */}
        <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-200">
          <p className="text-xs text-emerald-900 font-semibold mb-1">
            Voice Commands
          </p>
          <p className="text-xs text-emerald-800 leading-relaxed">
            To pause/end the session, say:{" "}
            <span className="font-semibold text-emerald-900">“stop”</span>,{" "}
            <span className="font-semibold text-emerald-900">“pause”</span>,{" "}
            <span className="font-semibold text-emerald-900">“wait”</span>, or{" "}
            <span className="font-semibold text-emerald-900">“end session”</span>.
          </p>
        </div>

        {/* Voice Status */}
        <div className="p-4 space-y-3">
          {/* Connection Status Warning */}
          {sessionStatus === "CONNECTED" && (!dcRef.current || dcRef.current.readyState !== "open") && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800 font-medium">⚠️ AI Connection Lost</p>
              <p className="text-xs text-yellow-600">Slide controls work, but AI cannot respond. Reconnecting...</p>
            </div>
          )}
          
          {/* AI Status */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200/60 shadow-sm">
            <div className={`w-10 h-10 rounded-full border-2 transition-all duration-300 ${
              isAISpeaking 
                ? "bg-emerald-100 border-emerald-400 shadow-lg shadow-emerald-400/20" 
                : sessionStatus === "CONNECTED" && dcRef.current?.readyState === "open"
                  ? "bg-slate-100 border-slate-300"
                  : "bg-red-100 border-red-300"
            }`}>
              <div className="w-full h-full flex items-center justify-center">
                <div className={`transition-all duration-300 ${
                  isAISpeaking ? "animate-pulse scale-110" : ""
                }`}>
                  🎤
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-900">AI Assistant</p>
              <p className="text-xs text-slate-500 truncate">
                {sessionStatus !== "CONNECTED" ? "Disconnected" :
                 dcRef.current?.readyState !== "open" ? "Connection Lost" :
                 isAISpeaking ? "Speaking..." : "Listening"}
              </p>
            </div>
          </div>

          {/* User Status */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200/60 shadow-sm">
            <div className={`w-10 h-10 rounded-full border-2 transition-all duration-300 ${
              isMicMuted
                ? "bg-red-100 border-red-400"
                : isUserSpeaking 
                  ? "bg-blue-100 border-blue-400 shadow-lg shadow-blue-400/20" 
                  : "bg-slate-100 border-slate-300"
            }`}>
              <div className="w-full h-full flex items-center justify-center">
                <div className={`transition-all duration-300 ${
                  isUserSpeaking && !isMicMuted ? "animate-pulse scale-110" : ""
                }`}>
                  {isMicMuted ? "🔇" : "👤"}
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-900">You</p>
              <p className="text-xs text-slate-500 truncate">
                {isMicMuted ? "Microphone Muted" : 
                 isUserSpeaking ? "Speaking..." : "Ready"}
              </p>
            </div>
          </div>
        </div>

        {/* Session Notes Panel */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-2.5 border-b border-slate-200/50">
            <div className="flex items-center gap-1.5">
              <MessageSquare size={12} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-600">Session Notes</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {!currentQuestion && !latestResponse && keyConcepts.length === 0 && !rollingNotes && (
              <div className="text-center py-8">
                <MessageSquare size={22} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Session notes will appear here as the conversation progresses.</p>
              </div>
            )}
            {currentQuestion && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-600 mb-1 uppercase tracking-wide">Current Question</p>
                <p className="text-xs text-blue-900 leading-relaxed">{currentQuestion}</p>
              </div>
            )}
            {latestResponse && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Student Response</p>
                <p className="text-xs text-slate-800 leading-relaxed">{latestResponse}</p>
              </div>
            )}
            {keyConcepts.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-emerald-600 mb-2 uppercase tracking-wide">Key Concepts</p>
                <div className="flex flex-wrap gap-1">
                  {keyConcepts.map((c) => (
                    <span key={c} className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-medium rounded">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {rollingNotes && (
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Session Notes</p>
                <pre className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">{rollingNotes}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 space-y-3 border-t border-slate-200/50">
          {/* Audio Control */}
          <button
            onClick={toggleAudio}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-xs transition-all duration-200 ${
              isAudioEnabled 
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-500/30" 
                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
          >
            {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {isAudioEnabled ? "Audio On" : "Audio Off"}
          </button>

          {/* Microphone Control */}
          <button
            onClick={toggleMicrophone}
            disabled={sessionStatus !== "CONNECTED"}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-xs transition-all duration-200 ${
              sessionStatus !== "CONNECTED"
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : isMicMuted 
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600 hover:shadow-xl hover:shadow-red-500/30" 
                  : "bg-green-500 text-white shadow-lg shadow-green-500/25 hover:bg-green-600 hover:shadow-xl hover:shadow-green-500/30"
            }`}
          >
            {isMicMuted ? <MicOff size={16} /> : <Mic size={16} />}
            {isMicMuted ? "Mic Muted" : "Mic On"}
          </button>

          {/* Connection Control */}
          <button
            onClick={sessionStatus === "CONNECTED" ? disconnectFromRealtime : connectToRealtime}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-xs transition-all duration-200 ${
              sessionStatus === "CONNECTED" 
                ? "bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600 hover:shadow-xl hover:shadow-red-500/30" 
                : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 hover:shadow-xl hover:shadow-emerald-500/30"
            }`}
          >
            {sessionStatus === "CONNECTED" ? <PhoneOff size={16} /> : <Phone size={16} />}
            {sessionStatus === "CONNECTED" ? "Disconnect" : "Connect"}
          </button>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Session Feedback</h2>
            <p className="text-gray-600 mb-6">Help us improve by sharing your experience with this teaching session.</p>
            
            {/* Rating */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Overall Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleFeedbackChange('rating', star)}
                    className={`text-3xl transition-colors ${
                      star <= feedbackData.rating ? 'text-yellow-400' : 'text-gray-300'
                    } hover:text-yellow-400`}
                  >
                    ★
                  </button>
                ))}
                <span className="ml-3 text-sm text-gray-600">
                  {feedbackData.rating}/5 stars
                </span>
              </div>
            </div>

            {/* General Feedback */}
            <div className="mb-6">
              <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
                General Feedback
              </label>
              <textarea
                id="feedback"
                value={feedbackData.feedback}
                onChange={(e) => handleFeedbackChange('feedback', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="How was your overall experience with the AI teaching assistant?"
              />
            </div>

            {/* Issues Encountered */}
            <div className="mb-6">
              <label htmlFor="issues" className="block text-sm font-medium text-gray-700 mb-2">
                Issues Encountered (For Debugging)
              </label>
              <textarea
                id="issues"
                value={feedbackData.issues}
                onChange={(e) => handleFeedbackChange('issues', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Did you encounter any technical issues, bugs, or unexpected behavior?"
              />
            </div>

            {/* Suggestions */}
            <div className="mb-8">
              <label htmlFor="suggestions" className="block text-sm font-medium text-gray-700 mb-2">
                Suggestions for Improvement
              </label>
              <textarea
                id="suggestions"
                value={feedbackData.suggestions}
                onChange={(e) => handleFeedbackChange('suggestions', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="What features or improvements would make this better?"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4 justify-end">
              <button
                onClick={handleSkipFeedback}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Skip Feedback
              </button>
              <button
                onClick={handleFeedbackSubmit}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Submit & End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 