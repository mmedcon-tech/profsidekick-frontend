/**
 * Thin fetch wrapper. Propagates all errors including 402 (Insufficient Credits)
 * so callers can redirect to the billing page or show an appropriate message.
 *
 * Usage:
 *   const data = await apiFetch(config.getApiUrl('/api/billing/balance'), { token });
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiFetchOptions extends RequestInit {
  token?: string;
}

export async function apiFetch<T = unknown>(
  url: string,
  { token, ...init }: ApiFetchOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...init, headers });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      message = body?.detail ?? body?.message ?? message;
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(response.status, message);
  }

  // Return parsed JSON or undefined for empty responses (204 etc.)
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  return undefined as unknown as T;
}
