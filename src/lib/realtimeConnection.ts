import { RefObject } from "react";

// Check if the environment supports getUserMedia
export function checkWebRTCSupport(): { supported: boolean; error?: string } {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { supported: false, error: 'Not running in browser environment' };
  }

  // Check for HTTPS (required for getUserMedia in modern browsers)
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    return { 
      supported: false, 
      error: 'HTTPS is required for microphone access. Please use a secure connection.' 
    };
  }

  // Check for getUserMedia support
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { 
      supported: false, 
      error: 'getUserMedia is not supported in this browser. Please use a modern browser.' 
    };
  }

  // Check for WebRTC support
  if (!window.RTCPeerConnection) {
    return { 
      supported: false, 
      error: 'WebRTC is not supported in this browser. Please use a modern browser.' 
    };
  }

  return { supported: true };
}

export async function createRealtimeConnection(
  EPHEMERAL_KEY: string,
  audioElement: RefObject<HTMLAudioElement | null>,
  codec: string,
  model: string = "gpt-realtime"
): Promise<{ pc: RTCPeerConnection; dc: RTCDataChannel; mediaStream: MediaStream }> {
  // Check WebRTC support first
  const supportCheck = checkWebRTCSupport();
  if (!supportCheck.supported) {
    throw new Error(supportCheck.error || 'WebRTC not supported');
  }

  // Create a new RTCPeerConnection
  const pc = new RTCPeerConnection();

  pc.ontrack = (e) => {
    if (audioElement.current) {
      audioElement.current.srcObject = e.streams[0];
    }
  };

  // Add local audio track for microphone input in the browser
  const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  pc.addTrack(mediaStream.getTracks()[0]);

  // Set codec preferences based on selected codec from the query parameter.
  const capabilities = RTCRtpSender.getCapabilities("audio");
  if (capabilities) {
    const chosenCodec = capabilities.codecs.find(
      (c) => c.mimeType.toLowerCase() === `audio/${codec}`
    );
    if (chosenCodec) {
      pc.getTransceivers()[0].setCodecPreferences([chosenCodec]);
    } else {
      console.warn(
        `Codec "${codec}" not found in capabilities. Using default settings.`
      );
    }
  }

  // Create a data channel for communication with the server
  const dc = pc.createDataChannel("oai-events");

  // Create an offer for the connection
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const baseUrl = "https://api.openai.com/v1/realtime";
  // Use the model parameter passed to the function
  console.log(`🤖 Using model: ${model}`);

  const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
    method: "POST",
    body: offer.sdp,
    headers: {
      Authorization: `Bearer ${EPHEMERAL_KEY}`,
      "Content-Type": "application/sdp",
    },
  });

  const answerSdp = await sdpResponse.text();
  const answer: RTCSessionDescriptionInit = {
    type: "answer",
    sdp: answerSdp,
  };

  await pc.setRemoteDescription(answer);

  return { pc, dc, mediaStream };
}
