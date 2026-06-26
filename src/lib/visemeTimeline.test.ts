import { describe, expect, it } from 'vitest';
import {
  buildEstimatedTimeline,
  buildTimelineFromAlignment,
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
});

describe('buildEstimatedTimeline', () => {
  it('spreads visemes across the audio duration', () => {
    const timeline = buildEstimatedTimeline('hello', 2);
    const total = timeline.keyframes.reduce((sum, kf) => sum + kf.duration, 0);
    expect(total).toBeGreaterThan(1.5);
    expect(timeline.duration).toBe(2);
  });
});

describe('sampleVisemeTimeline', () => {
  it('returns different mouth shapes at different times', () => {
    const timeline = buildEstimatedTimeline('aba', 1.2);
    const early = sampleVisemeTimeline(timeline, 0.05, 'arkit');
    const later = sampleVisemeTimeline(timeline, 0.55, 'arkit');
    expect(early).not.toEqual(later);
  });

  it('returns silence weights before speech starts', () => {
    const timeline = buildEstimatedTimeline('hi', 1);
    const silent = sampleVisemeTimeline(timeline, -0.1, 'roblox');
    expect(silent.jawOpen ?? 0).toBeLessThan(0.1);
  });
});
