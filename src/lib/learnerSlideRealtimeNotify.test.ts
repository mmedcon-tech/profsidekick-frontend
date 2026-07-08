import { describe, expect, it, vi } from 'vitest';
import { notifyLearnerSlideChangeToRealtime } from './learnerSlideRealtimeNotify';
import type { SlideData } from '@/types/types';

const slides: SlideData[] = [
  {
    id: 1,
    slideNumber: 1,
    title: 'Intro',
    content: 'Welcome.',
    imagePath: '/1.png',
    thumbnailPath: '/1t.png',
  },
  {
    id: 2,
    slideNumber: 2,
    title: 'Chapter 2',
    content: 'Deeper material.',
    imagePath: '/2.png',
    thumbnailPath: '/2t.png',
  },
];

describe('notifyLearnerSlideChangeToRealtime', () => {
  it('cancels speech, updates session, sends slide message, then creates response', () => {
    vi.useFakeTimers();
    const send = vi.fn();

    notifyLearnerSlideChangeToRealtime({
      send,
      slides,
      slideIndex: 1,
      action: 'next',
      sessionMode: 'teaching',
    });

    expect(send).toHaveBeenCalledWith({ type: 'response.cancel' }, 'slide.learner.cancel');
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'session.update' }),
      'slide.learner.context_update',
    );

    vi.advanceTimersByTime(150);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'conversation.item.create',
        item: expect.objectContaining({
          role: 'user',
          content: expect.arrayContaining([
            expect.objectContaining({ text: expect.stringMatching(/pressed Next/i) }),
          ]),
        }),
      }),
      'slide.learner.message',
    );

    vi.advanceTimersByTime(200);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'response.create' }),
      'slide.learner.response',
    );

    vi.useRealTimers();
  });
});
