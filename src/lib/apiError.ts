/** Turn FastAPI / backend error payloads into a user-facing string. */
export function formatApiError(
  data: unknown,
  fallback = 'Request failed',
): string {
  if (!data || typeof data !== 'object') return fallback;
  const record = data as Record<string, unknown>;

  if (typeof record.detail === 'string') return record.detail;
  if (typeof record.message === 'string') return record.message;
  if (typeof record.error === 'string') return record.error;

  if (Array.isArray(record.detail)) {
    return record.detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const err = item as { msg?: unknown; loc?: unknown[] };
          if (typeof err.msg === 'string') {
            const field = Array.isArray(err.loc)
              ? err.loc.filter((p) => typeof p === 'string' && p !== 'body').join('. ')
              : '';
            return field ? `${field}: ${err.msg}` : err.msg;
          }
        }
        return JSON.stringify(item);
      })
      .join('. ');
  }

  if (record.detail && typeof record.detail === 'object') {
    return JSON.stringify(record.detail);
  }

  return fallback;
}
