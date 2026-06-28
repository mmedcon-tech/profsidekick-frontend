export type SlideNavigationSource =
  | 'manual_navigation'
  | 'dot_navigation'
  | 'ai_tool'
  | 'resume_session';

export interface SlideNavigationResult {
  success: boolean;
  previousIndex: number;
  currentIndex: number;
  message: string;
}

export function getMaxSlideIndex(slideCount: number): number {
  return Math.max(0, slideCount - 1);
}

export function navigateNextSlide(
  currentIndex: number,
  slideCount: number,
): SlideNavigationResult {
  if (slideCount <= 0) {
    return {
      success: false,
      previousIndex: currentIndex,
      currentIndex,
      message: 'No slides available',
    };
  }

  if (currentIndex >= slideCount - 1) {
    return {
      success: false,
      previousIndex: currentIndex,
      currentIndex,
      message: 'Already at last slide',
    };
  }

  const nextIndex = currentIndex + 1;
  return {
    success: true,
    previousIndex: currentIndex,
    currentIndex: nextIndex,
    message: `Moved to slide ${nextIndex + 1}`,
  };
}

export function navigatePreviousSlide(
  currentIndex: number,
  slideCount: number,
): SlideNavigationResult {
  if (slideCount <= 0) {
    return {
      success: false,
      previousIndex: currentIndex,
      currentIndex,
      message: 'No slides available',
    };
  }

  if (currentIndex <= 0) {
    return {
      success: false,
      previousIndex: currentIndex,
      currentIndex,
      message: 'Already at first slide',
    };
  }

  const previousIndex = currentIndex - 1;
  return {
    success: true,
    previousIndex: currentIndex,
    currentIndex: previousIndex,
    message: `Moved to slide ${previousIndex + 1}`,
  };
}

export function navigateToSlideNumber(
  currentIndex: number,
  slideNumber: number,
  slideCount: number,
): SlideNavigationResult {
  const targetIndex = Math.floor(slideNumber) - 1;
  return navigateToIndex(currentIndex, targetIndex, slideCount);
}

export function navigateToIndex(
  currentIndex: number,
  targetIndex: number,
  slideCount: number,
): SlideNavigationResult {
  if (slideCount <= 0) {
    return {
      success: false,
      previousIndex: currentIndex,
      currentIndex,
      message: 'No slides available',
    };
  }

  if (targetIndex < 0 || targetIndex >= slideCount) {
    return {
      success: false,
      previousIndex: currentIndex,
      currentIndex,
      message: 'Invalid slide number',
    };
  }

  if (targetIndex === currentIndex) {
    return {
      success: false,
      previousIndex: currentIndex,
      currentIndex,
      message: `Already on slide ${targetIndex + 1}`,
    };
  }

  return {
    success: true,
    previousIndex: currentIndex,
    currentIndex: targetIndex,
    message: `Moved to slide ${targetIndex + 1}`,
  };
}

export function toSlideToolPayload(result: SlideNavigationResult): {
  previousSlide: number;
  currentSlide: number;
} {
  return {
    previousSlide: result.previousIndex + 1,
    currentSlide: result.currentIndex + 1,
  };
}
