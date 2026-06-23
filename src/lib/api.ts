/**
 * Thin fetch wrapper. Propagates all errors including 402 (Insufficient Credits)
 * so callers can redirect to the billing page or show an appropriate message.
 *
 * On 401, when auth handlers are registered (via AuthProvider), attempts one
 * token refresh and retries the request once. A second 401 clears auth and
 * redirects to login.
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

export interface ApiAuthHandlers {
  refreshToken: () => Promise<void>;
  getToken: () => string | null;
  clearAuthAndRedirect: () => void;
}

let apiAuthHandlers: ApiAuthHandlers | null = null;

export function registerApiAuthHandlers(handlers: ApiAuthHandlers): void {
  apiAuthHandlers = handlers;
}

export function resetApiAuthHandlers(): void {
  apiAuthHandlers = null;
}

interface ApiFetchOptions extends RequestInit {
  token?: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
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

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  return undefined as unknown as T;
}

async function requestWithAuth(
  url: string,
  init: RequestInit,
  token?: string,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }
  // Tells nginx which backend to route this request to.
  // Set NEXT_PUBLIC_FRONTEND_INSTANCE=autograder in the autograder Vercel env vars.
  headers.set('X-Frontend-Instance', process.env.NEXT_PUBLIC_FRONTEND_INSTANCE ?? 'autograder');
  return fetch(url, { ...init, headers });
}

export async function apiFetch<T = unknown>(
  url: string,
  { token, ...init }: ApiFetchOptions = {},
): Promise<T> {
  return apiFetchInternal<T>(url, { token, ...init }, false);
}

async function apiFetchInternal<T>(
  url: string,
  options: ApiFetchOptions,
  isRetry: boolean,
): Promise<T> {
  const { token, ...init } = options;
  const response = await requestWithAuth(url, init, token);

  if (response.status === 401 && apiAuthHandlers) {
    if (isRetry) {
      apiAuthHandlers.clearAuthAndRedirect();
      return parseResponse<T>(response);
    }

    try {
      await apiAuthHandlers.refreshToken();
    } catch {
      apiAuthHandlers.clearAuthAndRedirect();
      return parseResponse<T>(response);
    }

    const newToken = apiAuthHandlers.getToken() ?? token;
    const retryResponse = await requestWithAuth(url, init, newToken);

    if (retryResponse.status === 401) {
      apiAuthHandlers.clearAuthAndRedirect();
    }

    return parseResponse<T>(retryResponse);
  }

  return parseResponse<T>(response);
}
