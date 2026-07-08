import { describe, expect, it } from 'vitest';
import {
  buildAiLeadSystemPrompt,
  buildLearnerSlideChangeMessage,
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
    expect(tools[0].description).toMatch(/finished teaching the current slide/i);
  });
});

describe('buildAiLeadSystemPrompt', () => {
  it('instructs the avatar to auto-advance in teaching mode', () => {
    const prompt = buildAiLeadSystemPrompt({
      slides,
      sessionMode: 'teaching',
      currentSlideIndex: 0,
    });
    expect(prompt).toMatch(/press Next or Previous/i);
    expect(prompt).toMatch(/call nextSlide\(\)/i);
    expect(prompt).toMatch(/Introduction/);
    expect(prompt).toMatch(/CURRENT POSITION/i);
    expect(prompt).toMatch(/Welcome to the course/);
    expect(prompt).not.toMatch(/Key ideas go here/);
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

describe('buildLearnerSlideChangeMessage', () => {
  it('tells the avatar to teach the new slide after learner presses Next', () => {
    const message = buildLearnerSlideChangeMessage(1, slides, 'next');
    expect(message).toMatch(/pressed Next/i);
    expect(message).toMatch(/Core Concepts/);
    expect(message).toMatch(/Key ideas/);
    expect(message).toMatch(/teach this aloud now/i);
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
