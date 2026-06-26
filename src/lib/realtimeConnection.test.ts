import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createRealtimeConnection } from './realtimeConnection';

describe('createRealtimeConnection', () => {
  const originalMediaDevices = navigator.mediaDevices;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      text: () => Promise.resolve('v=0\n'),
    }));

    vi.stubGlobal('RTCRtpSender', {
      getCapabilities: () => ({
        codecs: [{ mimeType: 'audio/opus' }],
      }),
    });

    vi.stubGlobal(
      'RTCPeerConnection',
      class {
        ontrack: ((event: RTCTrackEvent) => void) | null = null;

        addTrack = vi.fn();
        createDataChannel = vi.fn(() => ({ readyState: 'open' }));
        createOffer = vi.fn(() => Promise.resolve({ type: 'offer', sdp: 'offer-sdp' }));
        setLocalDescription = vi.fn(() => Promise.resolve());
        setRemoteDescription = vi.fn(() => Promise.resolve());
        getTransceivers = vi.fn(() => [
          {
            setCodecPreferences: vi.fn(),
          },
        ]);
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: originalMediaDevices,
    });
  });

  it('can create the realtime connection with microphone input disabled initially', async () => {
    const audioTrack = { enabled: true };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getAudioTracks: () => [audioTrack],
        }),
      },
    });

    await createRealtimeConnection(
      'ephemeral-token',
      { current: document.createElement('audio') },
      'opus',
      'gpt-realtime',
      false,
    );

    expect(audioTrack.enabled).toBe(false);
  });
});
