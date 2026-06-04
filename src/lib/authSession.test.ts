import { describe, expect, it } from 'vitest';
import {
  PROACTIVE_REFRESH_THRESHOLD_MS,
  shouldProactivelyRefresh,
} from './authSession';

describe('shouldProactivelyRefresh', () => {
  it('returns false when expires_at is missing', () => {
    expect(shouldProactivelyRefresh(null)).toBe(false);
  });

  it('returns true when expiry is within 30 minutes', () => {
    const inTwentyMinutes = new Date(
      Date.now() + 20 * 60 * 1000,
    ).toISOString();
    expect(shouldProactivelyRefresh(inTwentyMinutes)).toBe(true);
  });

  it('returns false when expiry is more than 30 minutes away', () => {
    const inTwoHours = new Date(
      Date.now() + 2 * 60 * 60 * 1000,
    ).toISOString();
    expect(shouldProactivelyRefresh(inTwoHours)).toBe(false);
  });

  it('returns true when token is already expired', () => {
    const expired = new Date(Date.now() - 60 * 1000).toISOString();
    expect(shouldProactivelyRefresh(expired)).toBe(true);
  });

  it('uses a 30-minute threshold constant', () => {
    expect(PROACTIVE_REFRESH_THRESHOLD_MS).toBe(30 * 60 * 1000);
  });
});
