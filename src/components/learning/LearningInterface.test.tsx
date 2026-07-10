import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LearningInterface from './LearningInterface';
import type { ClassSession } from '@/types/types';

// ── Heavy/impure dependencies are mocked so this test exercises only the
// component's own logic: transcript capture (both legacy and GA Realtime
// event names) and the transcript-panel UI wired to it. ─────────────────────

vi.mock('@heygen/streaming-avatar', () => ({
  default: class MockStreamingAvatar {},
  AvatarQuality: { Medium: 'medium' },
  StreamingEvents: { STREAM_READY: 'stream_ready', STREAM_DISCONNECTED: 'stream_disconnected' },
  TaskType: { REPEAT: 'repeat' },
}));

vi.mock('@/components/avatar/SessionAvatarRenderer', () => ({
  default: () => <div data-testid="mock-avatar-renderer" />,
}));

vi.mock('@/hooks/useRealtimeTeachingLipSync', () => ({
  useRealtimeTeachingLipSync: () => 0,
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
      {
        id: 1,
        slideNumber: 1,
        title: 'Intro',
        content: '',
        imagePath: '',
        thumbnailPath: '',
      },
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
  };
}

/** Renders LearningInterface, drives the mocked connection to "open", and returns the fake data channel. */
async function renderConnected(props: Partial<Parameters<typeof LearningInterface>[0]> = {}) {
  const fakeDc = createFakeDataChannel();
  const fakePc = createFakePeerConnection();
  const fakeMediaStream = createFakeMediaStream();

  fetchSessionEphemeral.mockResolvedValue({
    openaiToken: 'ephemeral-token',
    realtimeModel: 'gpt-realtime-2',
    avatar: { renderType: 'glb', avatarName: 'Test Avatar', glbLibraryId: 'avatar-1' },
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
      {...props}
    />,
  );

  await waitFor(() =>
    expect(createRealtimeConnection).toHaveBeenCalled(),
  );

  fakeDc.readyState = 'open';
  await act(async () => {
    fakeDc.dispatch('open');
  });

  return { fakeDc, onEndSession };
}

beforeEach(() => {
  fetchSessionEphemeral.mockReset();
  createRealtimeConnection.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('LearningInterface — assistant transcript capture', () => {
  it.each([
    ['legacy preview event name', 'response.audio_transcript.done'],
    ['current GA event name', 'response.output_audio_transcript.done'],
  ])(
    'shows the assistant turn in the transcript panel for %s (%s)',
    async (_label, eventType) => {
      const { fakeDc } = await renderConnected();

      await act(async () => {
        fakeDc.dispatch('message', {
          data: JSON.stringify({
            type: eventType,
            transcript: 'Hello from the assistant',
          }),
        });
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /transcript/i }));

      await waitFor(() =>
        expect(screen.getByText('Hello from the assistant')).toBeInTheDocument(),
      );
    },
  );

  it('does not show assistant text for an unrelated/unknown event type', async () => {
    const { fakeDc } = await renderConnected();

    await act(async () => {
      fakeDc.dispatch('message', {
        data: JSON.stringify({ type: 'response.created' }),
      });
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /transcript/i }));

    expect(
      screen.getByText(/transcript will appear here once the session starts/i),
    ).toBeInTheDocument();
  });
});

describe('LearningInterface — user text input', () => {
  it('shows a typed message in the transcript panel immediately', async () => {
    await renderConnected();

    const user = userEvent.setup();
    await user.type(
      screen.getByPlaceholderText('Type your question...'),
      'What is on this slide?',
    );
    await user.click(screen.getByRole('button', { name: /send typed message/i }));

    // Sending a text message auto-opens the transcript panel (submitTextMessage
    // calls setIsTranscriptVisible(true)), so no extra toggle click is needed.
    await waitFor(() =>
      expect(screen.getByText('What is on this slide?')).toBeInTheDocument(),
    );
  });
});

describe('LearningInterface — session reset', () => {
  it('clears the transcript when sessionRunId changes for a new session run', async () => {
    const fakeDc = createFakeDataChannel();
    fetchSessionEphemeral.mockResolvedValue({
      openaiToken: 'ephemeral-token',
      realtimeModel: 'gpt-realtime-2',
      avatar: { renderType: 'glb', avatarName: 'Test Avatar', glbLibraryId: 'avatar-1' },
    });
    createRealtimeConnection.mockResolvedValue({
      pc: createFakePeerConnection(),
      dc: fakeDc,
      mediaStream: createFakeMediaStream(),
    });

    const { rerender } = render(
      <LearningInterface
        classSession={baseClassSession()}
        onEndSession={vi.fn()}
        sessionRunId="run-1"
      />,
    );

    await waitFor(() => expect(createRealtimeConnection).toHaveBeenCalled());
    fakeDc.readyState = 'open';
    await act(async () => {
      fakeDc.dispatch('open');
    });
    await act(async () => {
      fakeDc.dispatch('message', {
        data: JSON.stringify({
          type: 'response.output_audio_transcript.done',
          transcript: 'First session turn',
        }),
      });
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /transcript/i }));
    await waitFor(() =>
      expect(screen.getByText('First session turn')).toBeInTheDocument(),
    );

    rerender(
      <LearningInterface
        classSession={baseClassSession()}
        onEndSession={vi.fn()}
        sessionRunId="run-2"
      />,
    );

    await waitFor(() =>
      expect(screen.queryByText('First session turn')).not.toBeInTheDocument(),
    );
  });
});

