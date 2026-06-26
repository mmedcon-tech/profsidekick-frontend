import { describe, expect, it } from 'vitest';
import {
  navigateNextSlide,
  navigatePreviousSlide,
  navigateToIndex,
  navigateToSlideNumber,
  toSlideToolPayload,
} from './slideNavigation';

describe('slideNavigation', () => {
  const slideCount = 5;

  it('moves to the next slide within bounds', () => {
    const result = navigateNextSlide(1, slideCount);
    expect(result).toEqual({
      success: true,
      previousIndex: 1,
      currentIndex: 2,
      message: 'Moved to slide 3',
    });
  });

  it('rejects next slide at the end', () => {
    const result = navigateNextSlide(4, slideCount);
    expect(result.success).toBe(false);
    expect(result.message).toBe('Already at last slide');
  });

  it('moves to the previous slide within bounds', () => {
    const result = navigatePreviousSlide(2, slideCount);
    expect(result).toEqual({
      success: true,
      previousIndex: 2,
      currentIndex: 1,
      message: 'Moved to slide 2',
    });
  });

  it('jumps to a 1-indexed slide number', () => {
    const result = navigateToSlideNumber(0, 4, slideCount);
    expect(result.success).toBe(true);
    expect(result.currentIndex).toBe(3);
  });

  it('rejects invalid slide numbers', () => {
    expect(navigateToIndex(0, 9, slideCount).success).toBe(false);
    expect(navigateToSlideNumber(0, 0, slideCount).success).toBe(false);
  });

  it('maps tool payload to 1-indexed slide numbers', () => {
    expect(
      toSlideToolPayload({
        success: true,
        previousIndex: 1,
        currentIndex: 2,
        message: 'Moved to slide 3',
      }),
    ).toEqual({ previousSlide: 2, currentSlide: 3 });
  });
});
