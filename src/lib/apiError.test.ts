import { describe, it, expect } from 'vitest';
import { formatApiError } from './apiError';

describe('formatApiError', () => {
  it('returns string detail', () => {
    expect(formatApiError({ detail: 'Email already registered' })).toBe(
      'Email already registered',
    );
  });

  it('joins validation error arrays', () => {
    expect(
      formatApiError({
        detail: [{ msg: 'Password too short' }, { msg: 'Invalid email' }],
      }),
    ).toBe('Password too short. Invalid email');
  });

  it('falls back when shape is unknown', () => {
    expect(formatApiError(null, 'Nope')).toBe('Nope');
  });
});
