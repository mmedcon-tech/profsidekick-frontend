import { describe, expect, it } from 'vitest';
import {
  buildCharacterTimelineFromAlignment,
  buildEstimatedTimeline,
  buildTimelineFromAlignment,
  refineVisemeTimeline,
  sampleVisemeTimeline,
} from './visemeTimeline';

describe('buildTimelineFromAlignment', () => {
  it('creates timed viseme keyframes from character alignment', () => {
    const timeline = buildTimelineFromAlignment({
      characters: ['H', 'e', 'l', 'l', 'o'],
      character_start_times_seconds: [0, 0.08, 0.16, 0.24, 0.32],
      character_end_times_seconds: [0.08, 0.16, 0.24, 0.32, 0.45],
    });

    expect(timeline.keyframes.length).toBeGreaterThan(0);
    expect(timeline.duration).toBeCloseTo(0.45);
    expect(timeline.keyframes[0].time).toBe(0);
  });

  it('collapses a "th" digraph into a single TH mouth shape', () => {
    const timeline = buildCharacterTimelineFromAlignment({
      characters: ['t', 'h', 'e'],
      character_start_times_seconds: [0, 0.1, 0.2],
      character_end_times_seconds: [0.1, 0.2, 0.35],
    });

    const visemes = timeline.keyframes.map((kf) => kf.viseme);
    expect(visemes).toContain('TH');
    // The "h" must not surface as its own wide-open "aa" gape.
    expect(visemes).not.toContain('aa');
  });
});

describe('buildEstimatedTimeline', () => {
  it('spreads visemes across the audio duration', () => {
    const timeline = buildEstimatedTimeline('hello', 2);
    const total = timeline.keyframes.reduce((sum, kf) => sum + kf.duration, 0);
    expect(total).toBeGreaterThan(1.5);
    expect(timeline.duration).toBe(2);
  });
});

describe('buildWordTimelineFromAlignment', () => {
  it('uses fewer keyframes than per-character alignment', () => {
    const alignment = {
      characters: ['H', 'e', 'l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd'],
      character_start_times_seconds: [0, 0.06, 0.12, 0.18, 0.24, 0.3, 0.36, 0.42, 0.48, 0.54, 0.6],
      character_end_times_seconds: [0.06, 0.12, 0.18, 0.24, 0.3, 0.36, 0.42, 0.48, 0.54, 0.6, 0.75],
    };
    const perChar = buildCharacterTimelineFromAlignment(alignment);
    const perWord = buildTimelineFromAlignment(alignment);
    expect(perWord.keyframes.length).toBeLessThan(perChar.keyframes.length);
  });
});

describe('refineVisemeTimeline', () => {
  it('merges rapid per-character keyframes into fewer holds', () => {
    const noisy = {
      keyframes: [
        { time: 0, viseme: 'aa' as const, duration: 0.04 },
        { time: 0.04, viseme: 'nn' as const, duration: 0.03 },
        { time: 0.07, viseme: 'E' as const, duration: 0.04 },
        { time: 0.11, viseme: 'nn' as const, duration: 0.03 },
        { time: 0.14, viseme: 'O' as const, duration: 0.06 },
      ],
      duration: 0.2,
    };
    const refined = refineVisemeTimeline(noisy);
    expect(refined.keyframes.length).toBeLessThan(noisy.keyframes.length);
  });
});

describe('sampleVisemeTimeline', () => {
  it('returns different mouth shapes at different times', () => {
    const timeline = buildEstimatedTimeline('hello world', 1.2);
    const early = sampleVisemeTimeline(timeline, 0.05, 'arkit');
    const later = sampleVisemeTimeline(timeline, 0.75, 'arkit');
    expect(early).not.toEqual(later);
  });

  it('returns silence weights before speech starts', () => {
    const timeline = buildEstimatedTimeline('hi', 1);
    const silent = sampleVisemeTimeline(timeline, -0.1, 'roblox');
    expect(silent.jawOpen ?? 0).toBeLessThan(0.1);
  });
});
