import { describe, expect, it } from 'vitest';
import {
  buildRealtimeSlideToolResponse,
  isRealtimeSlideTool,
  resolveSlideToolTarget,
} from './realtimeSlideTools';

describe('realtimeSlideTools', () => {
  it('identifies slide navigation tools', () => {
    expect(isRealtimeSlideTool('nextSlide')).toBe(true);
    expect(isRealtimeSlideTool('searchKnowledgeBase')).toBe(false);
  });

  it('resolves next and previous slide targets', () => {
    expect(resolveSlideToolTarget('nextSlide', {}, 1, 5)).toBe(2);
    expect(resolveSlideToolTarget('previousSlide', {}, 2, 5)).toBe(1);
    expect(resolveSlideToolTarget('goToSlide', { slideNumber: 4 }, 0, 5)).toBe(3);
  });

  it('builds a next-slide tool response payload', () => {
    const payload = buildRealtimeSlideToolResponse(
      'nextSlide',
      {
        success: true,
        previousIndex: 0,
        currentIndex: 1,
        message: 'Moved to slide 2',
      },
      [
        {
          id: 1,
          slideNumber: 1,
          title: 'Intro',
          content: 'Hello',
          imagePath: '/slides/1.png',
          thumbnailPath: '/slides/1-thumb.png',
        },
        {
          id: 2,
          slideNumber: 2,
          title: 'Chapter 2',
          content: 'More',
          imagePath: '/slides/2.png',
          thumbnailPath: '/slides/2-thumb.png',
        },
      ],
      1,
    );

    expect(payload.success).toBe(true);
    expect(payload.message).toMatch(/slide 2/i);
    expect(payload.data).toMatchObject({
      currentSlide: 2,
      slideTitle: 'Chapter 2',
    });
  });
});
