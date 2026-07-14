import { describe, it, expect } from 'vitest';
import { normalizeCompletionPercent, resolveLocalizedLabel } from './analyticsLabels';

describe('resolveLocalizedLabel', () => {
  it('returns string labels directly', () => {
    expect(resolveLocalizedLabel('Economics 101')).toBe('Economics 101');
  });

  it('picks language from bilingual objects', () => {
    expect(resolveLocalizedLabel({ en: 'Math', ar: 'رياضيات' }, 'en')).toBe('Math');
    expect(resolveLocalizedLabel({ en: 'Math', ar: 'رياضيات' }, 'ar')).toBe('رياضيات');
  });

  it('falls back for empty or invalid values', () => {
    expect(resolveLocalizedLabel(null)).toBe('Untitled');
    expect(resolveLocalizedLabel({})).toBe('Untitled');
    expect(resolveLocalizedLabel('   ')).toBe('Untitled');
  });
});

describe('normalizeCompletionPercent', () => {
  it('clamps and rounds completion values', () => {
    expect(normalizeCompletionPercent(42.6)).toBe(43);
    expect(normalizeCompletionPercent(-5)).toBe(0);
    expect(normalizeCompletionPercent(140)).toBe(100);
    expect(normalizeCompletionPercent('not-a-number')).toBe(0);
  });
});
