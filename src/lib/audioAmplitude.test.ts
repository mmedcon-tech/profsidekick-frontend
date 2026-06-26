import { describe, expect, it } from 'vitest';
import { computeNormalizedAmplitude } from './audioAmplitude';

describe('computeNormalizedAmplitude', () => {
  it('returns 0 for empty input', () => {
    expect(computeNormalizedAmplitude(new Uint8Array(0))).toBe(0);
  });

  it('weights mid-spectrum speech bins more than silence', () => {
    const silent = new Uint8Array(128).fill(0);
    const speech = new Uint8Array(128).fill(0);
    for (let i = 4; i < 40; i += 1) {
      speech[i] = 180;
    }

    expect(computeNormalizedAmplitude(speech)).toBeGreaterThan(
      computeNormalizedAmplitude(silent),
    );
  });

  it('clamps output to 0–1', () => {
    const loud = new Uint8Array(128).fill(255);
    const value = computeNormalizedAmplitude(loud);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  });
});
