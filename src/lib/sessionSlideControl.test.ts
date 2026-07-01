import { describe, expect, it } from 'vitest';
import {
  buildAiLeadSystemPrompt,
  buildSessionKickoffMessage,
  buildSlideNavigationTools,
  buildSlideToolResultData,
  parsePublisherInstructions,
} from './sessionSlideControl';
import type { SlideData } from '@/types/types';

const slides: SlideData[] = [
  {
    id: 1,
    slideNumber: 1,
    title: 'Introduction',
    content: 'Welcome to the course.',
    imagePath: '/a.png',
    thumbnailPath: '/a-thumb.png',
  },
  {
    id: 2,
    slideNumber: 2,
    title: 'Core Concepts',
    content: 'Key ideas go here.',
    imagePath: '/b.png',
    thumbnailPath: '/b-thumb.png',
  },
];

describe('buildSlideNavigationTools', () => {
  it('registers proactive slide navigation tools', () => {
    const tools = buildSlideNavigationTools();
    expect(tools.map((t) => t.name)).toEqual(['nextSlide', 'previousSlide', 'goToSlide']);
    expect(tools[0].description).toMatch(/proactively/i);
  });
});

describe('buildAiLeadSystemPrompt', () => {
  it('instructs the avatar to auto-advance in teaching mode', () => {
    const prompt = buildAiLeadSystemPrompt({
      slides,
      sessionMode: 'teaching',
      currentSlideIndex: 0,
    });
    expect(prompt).toMatch(/call nextSlide\(\)/i);
    expect(prompt).toMatch(/Introduction/);
    expect(prompt).toMatch(/CURRENT POSITION/i);
  });

  it('uses a lighter navigation policy in examination mode', () => {
    const prompt = buildAiLeadSystemPrompt({
      slides,
      sessionMode: 'examination',
      currentSlideIndex: 1,
    });
    expect(prompt).toMatch(/oral examination/i);
    expect(prompt).not.toMatch(/Advance automatically once you have covered the current slide/);
  });
});

describe('buildSessionKickoffMessage', () => {
  it('asks the avatar to teach and advance in teaching mode', () => {
    const message = buildSessionKickoffMessage(0, 'Introduction', 'teaching');
    expect(message).toMatch(/call nextSlide\(\)/i);
  });
});

describe('parsePublisherInstructions', () => {
  it('extracts editable instructions from JSON payloads', () => {
    const raw = JSON.stringify({
      editable: 'Focus on clinical examples.',
      sessionBehavior: { sessionInstructions: 'Keep answers concise.' },
    });
    expect(parsePublisherInstructions(raw)).toContain('clinical examples');
    expect(parsePublisherInstructions(raw)).toContain('concise');
  });
});

describe('buildSlideToolResultData', () => {
  it('returns slide context for the AI after navigation', () => {
    const data = buildSlideToolResultData(slides, 1, 0);
    expect(data.currentSlide).toBe(2);
    expect(data.slideTitle).toBe('Core Concepts');
    expect(data.slideContent).toContain('Key ideas');
  });
});
