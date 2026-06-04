export const AUTH_TOKEN_KEY = 'auth_token';
export const AUTH_USER_KEY = 'auth_user';
export const AUTH_EXPIRES_AT_KEY = 'auth_expires_at';

/** Refresh when the token expires within this window (30 minutes). */
export const PROACTIVE_REFRESH_THRESHOLD_MS = 30 * 60 * 1000;

export function shouldProactivelyRefresh(
  expiresAtIso: string | null,
  nowMs: number = Date.now(),
): boolean {
  if (!expiresAtIso) {
    return false;
  }
  const expiresMs = new Date(expiresAtIso).getTime();
  if (Number.isNaN(expiresMs)) {
    return false;
  }
  return expiresMs - nowMs <= PROACTIVE_REFRESH_THRESHOLD_MS;
}

export function persistAuthSession(params: {
  token: string;
  user: unknown;
  expiresAt?: string | null;
}): void {
  localStorage.setItem(AUTH_TOKEN_KEY, params.token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(params.user));
  if (params.expiresAt) {
    localStorage.setItem(AUTH_EXPIRES_AT_KEY, params.expiresAt);
  }
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_EXPIRES_AT_KEY);
}
