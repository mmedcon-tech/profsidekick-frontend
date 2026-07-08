/**
 * Role vocabulary bridge between the frontend and backend.
 *
 * The frontend routes and guards everything on `publisher` / `subscriber` / `admin`,
 * while the backend persists and returns `professor` / `student` / `admin`.
 * These helpers translate at the BFF boundary so each side keeps its own vocabulary.
 */

export type FrontendRole = 'publisher' | 'subscriber' | 'admin';
export type BackendRole = 'professor' | 'student' | 'admin';

const BACKEND_TO_FRONTEND: Record<string, FrontendRole> = {
  professor: 'publisher',
  student: 'subscriber',
  admin: 'admin',
};

const FRONTEND_TO_BACKEND: Record<string, BackendRole> = {
  publisher: 'professor',
  subscriber: 'student',
  admin: 'admin',
};

/** Map a backend role (`professor`/`student`/`admin`) to the frontend vocabulary. */
export function toFrontendRole(role: string | null | undefined): string | null | undefined {
  if (role == null) return role;
  return BACKEND_TO_FRONTEND[role] ?? role;
}

/** Map a frontend role (`publisher`/`subscriber`/`admin`) to the backend vocabulary. */
export function toBackendRole(role: string | null | undefined): string | null | undefined {
  if (role == null) return role;
  return FRONTEND_TO_BACKEND[role] ?? role;
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
