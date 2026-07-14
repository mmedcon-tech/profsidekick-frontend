import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor, cleanup } from '@testing-library/react';
import LearningInterface from './LearningInterface';
import type { ClassSession } from '@/types/types';

vi.mock('@heygen/streaming-avatar', () => ({
  default: class MockStreamingAvatar {},
  AvatarQuality: { Medium: 'medium' },
  StreamingEvents: { STREAM_READY: 'stream_ready', STREAM_DISCONNECTED: 'stream_disconnected' },
  TaskType: { REPEAT: 'repeat' },
}));

const rendererProps = vi.hoisted(() => ({ current: [] as any[] }));
vi.mock('@/components/avatar/SessionAvatarRenderer', () => ({
  default: (props: any) => {
    rendererProps.current.push(props);
    return <div data-testid="mock-avatar-renderer" />;
  },
}));

vi.mock('@/hooks/useRealtimeTeachingLipSync', () => ({
  useRealtimeTeachingLipSync: () => 0,
}));

const elevenLabsSink = vi.hoisted(() => ({
  audioElement: { __marker: 'elevenlabs-sink-audio' } as unknown as HTMLAudioElement,
  push: vi.fn(),
  stop: vi.fn(),
}));
vi.mock('@/hooks/useElevenLabsAudioSink', () => ({
  useElevenLabsAudioSink: () => elevenLabsSink,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

vi.mock('@/contexts/EventContext', () => ({
  useEvent: () => ({ logClientEvent: vi.fn(), logServerEvent: vi.fn() }),
}));

vi.mock('@/contexts/StructuredTranscriptContext', () => ({
  useStructuredTranscript: () => ({
    currentQuestion: null,
    latestResponse: null,
    keyConcepts: [],
    rollingNotes: '',
    addStructuredTurn: vi.fn(),
  }),
}));

vi.mock('@/hooks/useHandleServerEvent', () => ({
  useHandleServerEvent: () => ({ current: vi.fn() }),
}));

vi.mock('@/hooks/useTranscriptPersistence', () => ({
  useTranscriptPersistence: () => vi.fn().mockResolvedValue(undefined),
}));

const fetchSessionEphemeral = vi.fn();
vi.mock('@/lib/sessionService', () => ({
  fetchSessionEphemeral: (...args: unknown[]) => fetchSessionEphemeral(...args),
  shouldUseHeyGenVideo: () => false,
}));

const createRealtimeConnection = vi.fn();
vi.mock('@/lib/realtimeConnection', () => ({
  createRealtimeConnection: (...args: unknown[]) => createRealtimeConnection(...args),
  checkWebRTCSupport: () => ({ supported: true }),
}));

/** A fake RTCDataChannel-like event target the test drives directly. */
function createFakeDataChannel() {
  const listeners: Record<string, Array<(e: any) => void>> = {};
  return {
    readyState: 'connecting' as string,
    send: vi.fn(),
    close: vi.fn(),
    addEventListener(type: string, handler: (e: any) => void) {
      (listeners[type] ??= []).push(handler);
    },
    removeEventListener(type: string, handler: (e: any) => void) {
      listeners[type] = (listeners[type] || []).filter((h) => h !== handler);
    },
    dispatch(type: string, event: any = {}) {
      (listeners[type] || []).forEach((h) => h(event));
    },
  };
}

function createFakePeerConnection() {
  return {
    getSenders: () => [],
    getTransceivers: () => [],
    getReceivers: () => [],
    addEventListener: vi.fn(),
    removeTrack: vi.fn(),
    close: vi.fn(),
  };
}

function createFakeMediaStream() {
  return {
    getTracks: () => [],
    getAudioTracks: () => [],
  };
}

function baseClassSession(): ClassSession {
  return {
    sessionId: 'session-1',
    processedContent: '',
    slides: [
      { id: 1, slideNumber: 1, title: 'Intro', content: '', imagePath: '', thumbnailPath: '' },
    ],
    classDetails: {
      className: 'Test Class',
      courseName: 'Test Course',
      courseCode: 'TC101',
      duration: 30,
      visionInstructions: '',
      assistant_parameters: {
        input_audio_format: 'pcm16',
        input_audio_noice_reduction: { type: 'near_field' },
        input_audio_transcription: { language: 'en', model: 'whisper-1' },
        instructions: '',
        model: 'gpt-realtime-2',
        output_audio_format: 'pcm16',
        temperature: 0.8,
        tool_choice: 'auto',
        tools: [],
        turn_detection: null,
        voice: 'alloy',
      },
    },
    totalSlides: 1,
    createdAt: new Date().toISOString(),
    status: 'RUNNING',
  } as unknown as ClassSession;
}

async function renderConnected(
  avatarOverrides: Record<string, unknown> = {},
) {
  const fakeDc = createFakeDataChannel();
  const fakePc = createFakePeerConnection();
  const fakeMediaStream = createFakeMediaStream();

  fetchSessionEphemeral.mockResolvedValue({
    openaiToken: 'ephemeral-token',
    realtimeModel: 'gpt-realtime-2',
    avatar: {
      renderType: 'glb',
      avatarName: 'Test Avatar',
      glbLibraryId: 'avatar-1',
      voiceProvider: 'openai',
      ...avatarOverrides,
    },
  });
  createRealtimeConnection.mockResolvedValue({
    pc: fakePc,
    dc: fakeDc,
    mediaStream: fakeMediaStream,
  });

  const onEndSession = vi.fn();
  render(
    <LearningInterface
      classSession={baseClassSession()}
      onEndSession={onEndSession}
      sessionRunId="run-1"
    />,
  );

  await waitFor(() => expect(createRealtimeConnection).toHaveBeenCalled());

  fakeDc.readyState = 'open';
  await act(async () => {
    fakeDc.dispatch('open');
  });

  return { fakeDc, onEndSession };
}

function lastSessionUpdate(fakeDc: ReturnType<typeof createFakeDataChannel>) {
  const calls = (fakeDc.send as ReturnType<typeof vi.fn>).mock.calls
    .map(([raw]) => JSON.parse(raw as string))
    .filter((event) => event.type === 'session.update');
  return calls[calls.length - 1];
}

beforeEach(() => {
  fetchSessionEphemeral.mockReset();
  createRealtimeConnection.mockReset();
  elevenLabsSink.push.mockReset();
  elevenLabsSink.stop.mockReset();
  rendererProps.current = [];
});

afterEach(() => {
  cleanup();
});

describe('LearningInterface — OpenAI voice engine (default, unchanged behavior)', () => {
  it('sends the resolved voice id in session.update and renders the WebRTC audio element', async () => {
    const { fakeDc } = await renderConnected({
      voiceProvider: 'openai',
      voiceId: 'ash',
    });

    const sessionUpdate = lastSessionUpdate(fakeDc);
    expect(sessionUpdate.session.audio.output.voice).toBe('ash');
    expect(sessionUpdate.session.modalities).toBeUndefined();

    const props = rendererProps.current[rendererProps.current.length - 1];
    expect(props.audioElement).not.toBe(elevenLabsSink.audioElement);
  });

  it('falls back to the gender-guessed voice when no explicit voiceId is resolved', async () => {
    const { fakeDc } = await renderConnected({ voiceProvider: 'openai', voiceId: undefined });

    const sessionUpdate = lastSessionUpdate(fakeDc);
    expect(sessionUpdate.session.audio.output.voice).toEqual(expect.any(String));
    expect(sessionUpdate.session.audio.output.voice.length).toBeGreaterThan(0);
  });
});

describe('LearningInterface — ElevenLabs voice engine', () => {
  it('requests text-only output and routes the avatar renderer to the ElevenLabs sink audio element', async () => {
    const { fakeDc } = await renderConnected({
      voiceProvider: 'elevenlabs',
      voiceId: 'eleven-voice-1',
    });

    const sessionUpdate = lastSessionUpdate(fakeDc);
    expect(sessionUpdate.session.modalities).toEqual(['text']);
    expect(sessionUpdate.session.audio).toBeUndefined();

    const props = rendererProps.current[rendererProps.current.length - 1];
    expect(props.audioElement).toBe(elevenLabsSink.audioElement);
  });

  it('accumulates text deltas, flushes clauses to the sink, and captures the full turn on response.done', async () => {
    const { fakeDc } = await renderConnected({ voiceProvider: 'elevenlabs', voiceId: 'v1' });

    await act(async () => {
      fakeDc.dispatch('message', {
        data: JSON.stringify({
          type: 'response.output_text.delta',
          item_id: 'item-1',
          delta: 'Hello there. ',
        }),
      });
    });

    expect(elevenLabsSink.push).toHaveBeenCalledWith('Hello there. ');

    await act(async () => {
      fakeDc.dispatch('message', {
        data: JSON.stringify({
          type: 'response.output_text.delta',
          item_id: 'item-1',
          delta: 'More context without a sentence end',
        }),
      });
    });
    // No trailing punctuation yet — should not have flushed a second clause.
    expect(elevenLabsSink.push).toHaveBeenCalledTimes(1);

    await act(async () => {
      fakeDc.dispatch('message', { data: JSON.stringify({ type: 'response.done' }) });
    });

    // The remaining unflushed pending clause is flushed on response.done.
    expect(elevenLabsSink.push).toHaveBeenCalledWith('More context without a sentence end');

    const user = (await import('@testing-library/user-event')).default.setup();
    await user.click(screen.getByRole('button', { name: /transcript/i }));

    // TranscriptPanel reveals text via a real setInterval typing animation
    // (18ms/tick) rather than rendering instantly — give it generous room in
    // a loaded CI/sandbox environment rather than racing the default timeout.
    await waitFor(
      () =>
        expect(
          screen.getByText('Hello there. More context without a sentence end'),
        ).toBeInTheDocument(),
      { timeout: 5000 },
    );
  });

  it('stops the ElevenLabs sink immediately when the user barges in', async () => {
    const { fakeDc } = await renderConnected({ voiceProvider: 'elevenlabs', voiceId: 'v1' });

    await act(async () => {
      fakeDc.dispatch('message', {
        data: JSON.stringify({ type: 'input_audio_buffer.speech_started' }),
      });
    });

    expect(elevenLabsSink.stop).toHaveBeenCalled();
  });
});
