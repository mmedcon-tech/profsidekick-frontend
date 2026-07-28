import { describe, expect, it } from 'vitest';
import {
  normalizeAuthUserRole,
  toBackendRole,
  toFrontendRole,
} from './roleMapping';

describe('toFrontendRole', () => {
  it('maps legacy backend roles to current vocabulary', () => {
    expect(toFrontendRole('professor')).toBe('publisher');
    expect(toFrontendRole('student')).toBe('subscriber');
    expect(toFrontendRole('admin')).toBe('admin');
  });

  it('passes through current roles and unknown/nullish values', () => {
    expect(toFrontendRole('publisher')).toBe('publisher');
    expect(toFrontendRole('subscriber')).toBe('subscriber');
    expect(toFrontendRole('weird')).toBe('weird');
    expect(toFrontendRole(null)).toBeNull();
    expect(toFrontendRole(undefined)).toBeUndefined();
  });
});

describe('toBackendRole', () => {
  it('sends current roles unchanged to the backend', () => {
    expect(toBackendRole('publisher')).toBe('publisher');
    expect(toBackendRole('subscriber')).toBe('subscriber');
    expect(toBackendRole('admin')).toBe('admin');
  });

  it('remaps legacy aliases if they slip through', () => {
    expect(toBackendRole('professor')).toBe('publisher');
    expect(toBackendRole('student')).toBe('subscriber');
    expect(toBackendRole('weird')).toBe('weird');
    expect(toBackendRole(null)).toBeNull();
    expect(toBackendRole(undefined)).toBeUndefined();
  });

  it('round-trips frontend -> backend -> frontend', () => {
    for (const role of ['publisher', 'subscriber', 'admin'] as const) {
      expect(toFrontendRole(toBackendRole(role))).toBe(role);
    }
  });
});

describe('normalizeAuthUserRole', () => {
  it('normalizes a nested legacy user role without mutating the input', () => {
    const input = { user: { id: '1', role: 'professor' }, token: 'abc' };
    const result = normalizeAuthUserRole(input);

    expect(result.user.role).toBe('publisher');
    expect(result.token).toBe('abc');
    expect(input.user.role).toBe('professor');
  });

  it('leaves payloads without a user untouched', () => {
    const input = { token: 'abc' };
    expect(normalizeAuthUserRole(input)).toEqual({ token: 'abc' });
  });

  it('handles a null user', () => {
    const input = { user: null, token: 'abc' };
    expect(normalizeAuthUserRole(input)).toEqual({ user: null, token: 'abc' });
  });
});
