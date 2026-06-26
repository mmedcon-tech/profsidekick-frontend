import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSimulatedAmplitude } from './useSimulatedAmplitude';

describe('useSimulatedAmplitude', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns 0 when disabled', () => {
    const { result } = renderHook(() => useSimulatedAmplitude(false));
    expect(result.current).toBe(0);
  });

  it('returns a value between 0 and 1 when enabled', () => {
    const { result } = renderHook(() => useSimulatedAmplitude(true));
    act(() => {});
    expect(result.current).toBeGreaterThanOrEqual(0);
    expect(result.current).toBeLessThanOrEqual(1);
  });
});
