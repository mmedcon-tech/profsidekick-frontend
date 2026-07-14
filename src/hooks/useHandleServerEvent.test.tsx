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
      const handlerRef = useHandleServerEvent({
        setSessionStatus: vi.fn(),
        selectedAgentName: 'teachingAssistant',
        selectedAgentConfigSet: null,
        sendClientEvent: vi.fn(),
        setSelectedAgentName: vi.fn(),
        setIsOutputAudioBufferActive: vi.fn(),
        onTurnComplete: vi.fn(),
      });
      const transcript = useTranscript();
      return { handlerRef, transcript };
    },
    { wrapper },
  );
}

describe.each([
  ['GA text-only event name', 'response.output_text.delta'],
  ['legacy/alternate text event name', 'response.text.delta'],
])('useHandleServerEvent — text-only assistant deltas (%s: %s)', (_label, eventType) => {
  it('accumulates text deltas into the transcript the same way audio-transcript deltas do', () => {
    const { result } = setup();

    act(() => {
      result.current.handlerRef.current({
        type: 'conversation.item.created',
        item: { id: 'item-1', role: 'assistant', content: [{ text: '' }] },
      } as unknown as ServerEvent);
    });

    act(() => {
      result.current.handlerRef.current({
        type: eventType,
        item_id: 'item-1',
        delta: 'Hello ',
      } as unknown as ServerEvent);
    });
    act(() => {
      result.current.handlerRef.current({
        type: eventType,
        item_id: 'item-1',
        delta: 'world.',
      } as unknown as ServerEvent);
    });

    const item = result.current.transcript.transcriptItems.find(
      (i) => i.itemId === 'item-1',
    );
    expect(item?.title).toBe('Hello world.');
  });

  it('flushes the accumulated text via onTurnComplete when response.done fires', () => {
    const onTurnComplete = vi.fn();
    const { result } = renderHook(
      () => {
        const handlerRef = useHandleServerEvent({
          setSessionStatus: vi.fn(),
          selectedAgentName: 'teachingAssistant',
          selectedAgentConfigSet: null,
          sendClientEvent: vi.fn(),
          setSelectedAgentName: vi.fn(),
          setIsOutputAudioBufferActive: vi.fn(),
          onTurnComplete,
        });
        return { handlerRef };
      },
      { wrapper },
    );

    act(() => {
      result.current.handlerRef.current({
        type: eventType,
        item_id: 'item-2',
        delta: 'Full turn text.',
      } as unknown as ServerEvent);
    });

    act(() => {
      result.current.handlerRef.current({
        type: 'response.done',
        response: {
          output: [{ id: 'item-2', type: 'message', role: 'assistant' }],
        },
      } as unknown as ServerEvent);
    });

    expect(onTurnComplete).toHaveBeenCalledWith('assistant', 'Full turn text.');
  });
});
