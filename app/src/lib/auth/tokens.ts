/**
 * Token + device storage.
 *
 * Mirrors frontend/lib/data/datasources/token_storage.dart: access (24 h) and
 * refresh (7 d) JWTs, stored per session. localStorage is acceptable for MVP
 * (flagged in ARCHITECTURE.md §9.17 — stateless logout, no server revocation).
 */

const ACCESS_KEY = 'confiddo.access_token'
const REFRESH_KEY = 'confiddo.refresh_token'
const ROLE_KEY = 'confiddo.role'
const USER_KEY = 'confiddo.user'
const DEVICE_KEY = 'confiddo.device_id'

// Always the window's storage: under vitest/jsdom on recent Node the bare `localStorage`
// global is Node's experimental stub, not the DOM one.
const storage = () => window.localStorage

export type Role = 'student' | 'teacher' | 'parent' | 'principal' | 'admin'

export const tokenStore = {
  get access(): string | null {
    return storage().getItem(ACCESS_KEY)
  },
  get refresh(): string | null {
    return storage().getItem(REFRESH_KEY)
  },
  get role(): Role | null {
    return storage().getItem(ROLE_KEY) as Role | null
  },
  /** Cached user profile from the login response (display only). */
  get user(): Record<string, unknown> | null {
    const raw = storage().getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  },

  save(args: {
    access: string
    refresh?: string | null
    role?: Role
    user?: Record<string, unknown>
  }) {
    storage().setItem(ACCESS_KEY, args.access)
    if (args.refresh) storage().setItem(REFRESH_KEY, args.refresh)
    if (args.role) storage().setItem(ROLE_KEY, args.role)
    if (args.user) storage().setItem(USER_KEY, JSON.stringify(args.user))
  },

  clear() {
    storage().removeItem(ACCESS_KEY)
    storage().removeItem(REFRESH_KEY)
    storage().removeItem(ROLE_KEY)
    storage().removeItem(USER_KEY)
    // device_id intentionally survives logout (parent 2-device cap counts
    // devices, not sessions — ARCHITECTURE.md §2.2).
  },
}

/** Stable per-browser device id, required for the parent 2-device cap. */
export function deviceId(): string {
  let id = storage().getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    storage().setItem(DEVICE_KEY, id)
  }
  return id
}
