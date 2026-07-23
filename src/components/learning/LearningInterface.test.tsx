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

/** Parses the raw JSON strings passed to fakeDc.send(...) back into objects. */
function sentEvents(fakeDc: ReturnType<typeof createFakeDataChannel>, fromIndex = 0) {
  return fakeDc.send.mock.calls.slice(fromIndex).map(([raw]: [string]) => JSON.parse(raw));
}

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

describe('LearningInterface — interrupt / resume', () => {
  it('sends response.cancel then output_audio_buffer.clear when interrupting', async () => {
    const { fakeDc } = await renderConnected();

    await act(async () => {
      fakeDc.dispatch('message', {
        data: JSON.stringify({ type: 'output_audio_buffer.started' }),
      });
    });

    const before = fakeDc.send.mock.calls.length;
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /interrupt/i }));

    const events = sentEvents(fakeDc, before);
    expect(events[0]).toEqual({ type: 'response.cancel' });
    expect(events[1]).toEqual({ type: 'output_audio_buffer.clear' });
  });

  it('also truncates the active assistant item with the elapsed audio duration', async () => {
    const { fakeDc } = await renderConnected();

    await act(async () => {
      fakeDc.dispatch('message', {
        data: JSON.stringify({
          type: 'conversation.item.created',
          item: { id: 'item_abc', role: 'assistant' },
        }),
      });
    });
    await act(async () => {
      fakeDc.dispatch('message', {
        data: JSON.stringify({ type: 'output_audio_buffer.started' }),
      });
    });

    const before = fakeDc.send.mock.calls.length;
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /interrupt/i }));

    const events = sentEvents(fakeDc, before);
    expect(events).toHaveLength(3);
    expect(events[2].type).toBe('conversation.item.truncate');
    expect(events[2].item_id).toBe('item_abc');
    expect(events[2].content_index).toBe(0);
    expect(events[2].audio_end_ms).toBeGreaterThanOrEqual(0);
  });

  it('does not truncate when nothing has played yet', async () => {
    const { fakeDc } = await renderConnected();

    const before = fakeDc.send.mock.calls.length;
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /interrupt/i }));

    const events = sentEvents(fakeDc, before);
    expect(events).toHaveLength(2);
    expect(events.some((e) => e.type === 'conversation.item.truncate')).toBe(false);
  });

  it('flips to Resume after Interrupt, and Resume sends a continuation nudge', async () => {
    const { fakeDc } = await renderConnected();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /interrupt/i }));
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();

    const before = fakeDc.send.mock.calls.length;
    await user.click(screen.getByRole('button', { name: /resume/i }));

    const events = sentEvents(fakeDc, before);
    expect(events[0].type).toBe('conversation.item.create');
    expect(events[0].item.role).toBe('system');
    expect(events[0].item.content[0].text).toMatch(/interrupted/i);
    expect(events[1]).toEqual({ type: 'response.create' });
    expect(screen.getByRole('button', { name: /interrupt/i })).toBeInTheDocument();
  });

  it('clears the tracked item once its turn ends naturally, so a later interrupt does not truncate it', async () => {
    const { fakeDc } = await renderConnected();

    await act(async () => {
      fakeDc.dispatch('message', {
        data: JSON.stringify({
          type: 'conversation.item.created',
          item: { id: 'item_x', role: 'assistant' },
        }),
      });
    });
    await act(async () => {
      fakeDc.dispatch('message', {
        data: JSON.stringify({ type: 'output_audio_buffer.started' }),
      });
    });
    await act(async () => {
      fakeDc.dispatch('message', {
        data: JSON.stringify({ type: 'output_audio_buffer.stopped' }),
      });
    });

    const before = fakeDc.send.mock.calls.length;
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /interrupt/i }));

    const events = sentEvents(fakeDc, before);
    expect(events).toHaveLength(2);
    expect(events.some((e) => e.type === 'conversation.item.truncate')).toBe(false);
  });

  it('clears the interrupt when the learner starts speaking again, without sending a resume nudge', async () => {
    const { fakeDc } = await renderConnected();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /interrupt/i }));
    const before = fakeDc.send.mock.calls.length;

    await act(async () => {
      fakeDc.dispatch('message', {
        data: JSON.stringify({ type: 'input_audio_buffer.speech_started' }),
      });
    });

    expect(screen.getByRole('button', { name: /interrupt the tutor/i })).toBeInTheDocument();
    expect(fakeDc.send.mock.calls.length).toBe(before);
  });

  it('clears the interrupt when the learner submits a typed message, without sending a resume nudge', async () => {
    const { fakeDc } = await renderConnected();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /interrupt/i }));
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();

    const before = fakeDc.send.mock.calls.length;
    await user.type(
      screen.getByPlaceholderText('Type your question...'),
      'Can you repeat that?',
    );
    await user.click(screen.getByRole('button', { name: /send typed message/i }));

    const events = sentEvents(fakeDc, before);
    expect(
      events.some(
        (e) =>
          e.type === 'conversation.item.create' &&
          e.item?.role === 'system' &&
          /interrupted/i.test(e.item?.content?.[0]?.text ?? ''),
      ),
    ).toBe(false);
    expect(screen.getByRole('button', { name: /interrupt the tutor/i })).toBeInTheDocument();
  });
});

