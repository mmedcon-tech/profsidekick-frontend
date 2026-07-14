/** Resolve analytics/course display names that may be string or { en, ar }. */
export function resolveLocalizedLabel(
  value: unknown,
  lang: 'en' | 'ar' = 'en',
  fallback = 'Untitled',
): string {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const preferred = record[lang];
    if (typeof preferred === 'string' && preferred.trim()) return preferred.trim();
    if (typeof record.en === 'string' && record.en.trim()) return record.en.trim();
    if (typeof record.ar === 'string' && record.ar.trim()) return record.ar.trim();
    if (typeof record.name === 'string' && record.name.trim()) return record.name.trim();
  }
  return fallback;
}

export function normalizeCompletionPercent(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
