import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useHandleServerEvent } from './useHandleServerEvent';
import { TranscriptProvider, useTranscript } from '@/contexts/TranscriptContext';
import { EventProvider } from '@/contexts/EventContext';
import type { ServerEvent } from '@/types/types';

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <EventProvider>
      <TranscriptProvider>{children}</TranscriptProvider>
    </EventProvider>
  );
}

function setup() {
  return renderHook(
    () => {
      const transcript = useTranscript();
      const handlerRef = useHandleServerEvent({
        setSessionStatus: vi.fn(),
        selectedAgentName: 'test-agent',
        selectedAgentConfigSet: null,
        sendClientEvent: vi.fn(),
        setSelectedAgentName: vi.fn(),
        setIsOutputAudioBufferActive: vi.fn(),
      });
      return { transcript, handlerRef };
    },
    { wrapper },
  );
}

// GA gpt-realtime models emit "response.output_audio_transcript.delta"; older
// preview models used "response.audio_transcript.delta". Both must update the
// live transcript identically — this is the same rename that silently broke
// the assistant's transcript in LearningInterface.tsx (fixed by accepting
// both event names there too).
describe.each([
  ['legacy preview event name', 'response.audio_transcript.delta'],
  ['current GA event name', 'response.output_audio_transcript.delta'],
])('response.*audio_transcript.delta (%s: %s)', (_label, eventType) => {
  it('accumulates delta text onto the transcript item for that turn', () => {
    const { result } = setup();

    // A real turn always starts with conversation.item.created establishing the item id.
    act(() => {
      result.current.handlerRef.current({
        type: 'conversation.item.created',
        item: { id: 'item-1', role: 'assistant', content: [{ text: '' }] },
      } as ServerEvent);
    });

    act(() => {
      result.current.handlerRef.current({
        type: eventType,
        item_id: 'item-1',
        delta: 'Hello',
      } as ServerEvent);
    });

    act(() => {
      result.current.handlerRef.current({
        type: eventType,
        item_id: 'item-1',
        delta: ' world',
      } as ServerEvent);
    });

    const item = result.current.transcript.transcriptItems.find(
      (i) => i.itemId === 'item-1',
    );
    expect(item?.title).toBe('Hello world');
  });
});

describe('conversation.item.input_audio_transcription.completed', () => {
  it('finalizes the user turn and reports it via onTurnComplete', () => {
    const onTurnComplete = vi.fn();
    const { result } = renderHook(
      () => {
        const transcript = useTranscript();
        const handlerRef = useHandleServerEvent({
          setSessionStatus: vi.fn(),
          selectedAgentName: 'test-agent',
          selectedAgentConfigSet: null,
          sendClientEvent: vi.fn(),
          setSelectedAgentName: vi.fn(),
          setIsOutputAudioBufferActive: vi.fn(),
          onTurnComplete,
        });
        return { transcript, handlerRef };
      },
      { wrapper },
    );

    act(() => {
      result.current.handlerRef.current({
        type: 'conversation.item.created',
        item: { id: 'item-2', role: 'user', content: [] },
      } as ServerEvent);
    });

    act(() => {
      result.current.handlerRef.current({
        type: 'conversation.item.input_audio_transcription.completed',
        item_id: 'item-2',
        transcript: 'What is on this slide?',
      } as ServerEvent);
    });

    expect(onTurnComplete).toHaveBeenCalledWith('user', 'What is on this slide?');
  });
});
