import type { SlideData } from '@/types/types';
import type { SlideNavigationResult } from '@/lib/slideNavigation';
import { buildSlideToolResultData } from '@/lib/sessionSlideControl';

export type RealtimeSlideToolName = 'nextSlide' | 'previousSlide' | 'goToSlide';

export function resolveSlideToolTarget(
  toolName: string,
  args: Record<string, unknown>,
  currentIndex: number,
  slideCount: number,
): number | null {
  if (toolName === 'nextSlide') {
    return currentIndex + 1;
  }
  if (toolName === 'previousSlide') {
    return currentIndex - 1;
  }
  if (toolName === 'goToSlide' && args.slideNumber !== undefined) {
    return Math.floor(Number(args.slideNumber)) - 1;
  }
  return null;
}

export function isRealtimeSlideTool(name: string): name is RealtimeSlideToolName {
  return name === 'nextSlide' || name === 'previousSlide' || name === 'goToSlide';
}

export function buildRealtimeSlideToolResponse(
  toolName: RealtimeSlideToolName,
  result: SlideNavigationResult,
  slides: SlideData[],
  requestedTarget: number,
): {
  success: boolean;
  message: string;
  data: object;
} {
  if (toolName === 'nextSlide') {
    return {
      success: result.success,
      message: result.success
        ? `Now on slide ${requestedTarget + 1}. Teach only this slide's content.`
        : result.message,
      data: buildSlideToolResultData(
        slides,
        result.success ? requestedTarget : result.currentIndex,
        result.previousIndex,
      ),
    };
  }

  return {
    success: result.success,
    message: result.message,
    data: buildSlideToolResultData(
      slides,
      result.currentIndex,
      result.previousIndex,
    ),
  };
}
