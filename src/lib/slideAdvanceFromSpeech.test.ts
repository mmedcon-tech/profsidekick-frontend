import { describe, expect, it } from 'vitest';
import {
  detectSlideAdvanceFromSpeech,
  extractRealtimeToolCalls,
} from './slideAdvanceFromSpeech';

describe('detectSlideAdvanceFromSpeech', () => {
  it('advances on explicit next-slide phrasing', () => {
    expect(
      detectSlideAdvanceFromSpeech(
        "Great, that covers slide one. Let's move on to the next slide.",
        0,
        5,
      ),
    ).toBe(1);
  });

  it('does not advance on the last slide', () => {
    expect(
      detectSlideAdvanceFromSpeech('Now the next slide.', 4, 5),
    ).toBeNull();
  });

  it('jumps to a higher explicit slide number', () => {
    expect(
      detectSlideAdvanceFromSpeech('Now let us look at slide 3.', 0, 5),
    ).toBe(2);
  });
});

describe('extractRealtimeToolCalls', () => {
  it('extracts from response.function_call_arguments.done', () => {
    expect(
      extractRealtimeToolCalls({
        type: 'response.function_call_arguments.done',
        name: 'nextSlide',
        call_id: 'call_abc',
        arguments: '{}',
      }),
    ).toEqual([
      {
        type: 'function_call',
        name: 'nextSlide',
        call_id: 'call_abc',
        arguments: '{}',
      },
    ]);
  });

  it('extracts function calls from response.done output', () => {
    expect(
      extractRealtimeToolCalls({
        type: 'response.done',
        response: {
          output: [
            { type: 'message', name: undefined },
            { type: 'function_call', name: 'nextSlide', call_id: 'call_xyz' },
          ],
        },
      }),
    ).toEqual([{ type: 'function_call', name: 'nextSlide', call_id: 'call_xyz' }]);
  });
});
