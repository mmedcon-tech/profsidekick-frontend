import { describe, expect, it, vi, afterEach } from 'vitest';
import { interruptActiveResponse, resumeInterruptedResponse } from './realtimeInterrupt';

describe('interruptActiveResponse', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends response.cancel then output_audio_buffer.clear when nothing is playing', () => {
    const send = vi.fn();

    interruptActiveResponse({
      send,
      activeAssistantItemId: null,
      audioStartedAtMs: null,
    });

    expect(send).toHaveBeenNthCalledWith(1, { type: 'response.cancel' }, 'interrupt.response_cancel');
    expect(send).toHaveBeenNthCalledWith(
      2,
      { type: 'output_audio_buffer.clear' },
      'interrupt.clear_audio_buffer',
    );
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'conversation.item.truncate' }),
      expect.anything(),
    );
  });

  it('also sends conversation.item.truncate with the computed audio_end_ms when an item was playing', () => {
    const send = vi.fn();

    interruptActiveResponse({
      send,
      activeAssistantItemId: 'item_123',
      audioStartedAtMs: 1000,
      now: 4200,
    });

    expect(send).toHaveBeenNthCalledWith(1, { type: 'response.cancel' }, 'interrupt.response_cancel');
    expect(send).toHaveBeenNthCalledWith(
      2,
      { type: 'output_audio_buffer.clear' },
      'interrupt.clear_audio_buffer',
    );
    expect(send).toHaveBeenNthCalledWith(
      3,
      {
        type: 'conversation.item.truncate',
        item_id: 'item_123',
        content_index: 0,
        audio_end_ms: 3200,
      },
      'interrupt.truncate_item',
    );
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('skips truncate when there is an item id but no start time', () => {
    const send = vi.fn();

    interruptActiveResponse({
      send,
      activeAssistantItemId: 'item_123',
      audioStartedAtMs: null,
      now: 4200,
    });

    expect(send).toHaveBeenCalledTimes(2);
  });

  it('skips truncate when there is a start time but no item id', () => {
    const send = vi.fn();

    interruptActiveResponse({
      send,
      activeAssistantItemId: null,
      audioStartedAtMs: 1000,
      now: 4200,
    });

    expect(send).toHaveBeenCalledTimes(2);
  });

  it('clamps audio_end_ms to 0 if now is earlier than the start time', () => {
    const send = vi.fn();

    interruptActiveResponse({
      send,
      activeAssistantItemId: 'item_123',
      audioStartedAtMs: 5000,
      now: 4200,
    });

    expect(send).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ audio_end_ms: 0 }),
      'interrupt.truncate_item',
    );
  });

  it('defaults now to performance.now() when omitted', () => {
    vi.spyOn(performance, 'now').mockReturnValue(9000);
    const send = vi.fn();

    interruptActiveResponse({
      send,
      activeAssistantItemId: 'item_123',
      audioStartedAtMs: 8000,
    });

    expect(send).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ audio_end_ms: 1000 }),
      'interrupt.truncate_item',
    );
  });
});

describe('resumeInterruptedResponse', () => {
  it('sends the system resume message then response.create', () => {
    const send = vi.fn();

    resumeInterruptedResponse({ send });

    expect(send).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: 'conversation.item.create',
        item: expect.objectContaining({
          role: 'system',
          content: expect.arrayContaining([
            expect.objectContaining({ text: expect.stringMatching(/interrupted/i) }),
          ]),
        }),
      }),
      'interrupt.resume_message',
    );
    expect(send).toHaveBeenNthCalledWith(2, { type: 'response.create' }, 'interrupt.resume_response');
    expect(send).toHaveBeenCalledTimes(2);
  });
});
