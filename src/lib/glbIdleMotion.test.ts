import { describe, expect, it } from 'vitest';
import { computeSidewaysIdleRotation } from './glbIdleMotion';

describe('computeSidewaysIdleRotation', () => {
  it('returns zero when idle strength is zero (fully speaking)', () => {
    expect(computeSidewaysIdleRotation(1.5, 0)).toBe(0);
  });

  it('scales the sway by idle strength', () => {
    const full = computeSidewaysIdleRotation(2.1, 1);
    const half = computeSidewaysIdleRotation(2.1, 0.5);
    expect(Math.abs(half)).toBeCloseTo(Math.abs(full) / 2, 6);
    expect(Math.abs(full)).toBeLessThanOrEqual(0.07);
  });

  it('defaults to full strength when omitted', () => {
    expect(computeSidewaysIdleRotation(2.1)).toBe(computeSidewaysIdleRotation(2.1, 1));
  });
});
