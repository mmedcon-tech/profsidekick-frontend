import { describe, expect, it } from 'vitest';
import { computeSidewaysIdleRotation } from './glbIdleMotion';

describe('glbIdleMotion', () => {
  it('returns a small oscillating Y rotation', () => {
    const a = computeSidewaysIdleRotation(0);
    const b = computeSidewaysIdleRotation(4);
    expect(Math.abs(a)).toBeLessThan(0.1);
    expect(a).not.toBe(b);
  });
});
