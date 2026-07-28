/**
 * Role vocabulary bridge between the frontend and backend.
 *
 * Both sides now use `publisher` / `subscriber` / `admin`.
 * Legacy backend values (`professor` / `student`) are still normalized
 * on read so older tokens or DB rows keep working.
 */

export type FrontendRole = 'publisher' | 'subscriber' | 'admin';
export type BackendRole = 'publisher' | 'subscriber' | 'admin';

const LEGACY_TO_CURRENT: Record<string, FrontendRole> = {
  professor: 'publisher',
  teacher: 'publisher',
  student: 'subscriber',
  publisher: 'publisher',
  subscriber: 'subscriber',
  admin: 'admin',
};

/** Map a backend/legacy role to the shared frontend vocabulary. */
export function toFrontendRole(role: string | null | undefined): string | null | undefined {
  if (role == null) return role;
  return LEGACY_TO_CURRENT[role] ?? role;
}

/**
 * Map a frontend role to the backend registration vocabulary.
 * Identity for current roles; remaps legacy aliases if they slip through.
 */
export function toBackendRole(role: string | null | undefined): string | null | undefined {
  if (role == null) return role;
  return LEGACY_TO_CURRENT[role] ?? role;
}

/** Return a shallow copy of an auth payload with its nested `user.role` normalized for the frontend. */
export function normalizeAuthUserRole<T>(data: T): T {
  if (data && typeof data === 'object' && 'user' in data) {
    const payload = data as { user?: { role?: string } | null };
    const user = payload.user;
    if (user && typeof user === 'object' && 'role' in user) {
      return {
        ...data,
        user: { ...user, role: toFrontendRole(user.role) },
      };
    }
  }
  return data;
}
