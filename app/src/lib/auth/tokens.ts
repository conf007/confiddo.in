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

export type Role = 'student' | 'teacher' | 'parent' | 'principal' | 'admin'

export const tokenStore = {
  get access(): string | null {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh(): string | null {
    return localStorage.getItem(REFRESH_KEY)
  },
  get role(): Role | null {
    return localStorage.getItem(ROLE_KEY) as Role | null
  },
  /** Cached user profile from the login response (display only). */
  get user(): Record<string, unknown> | null {
    const raw = localStorage.getItem(USER_KEY)
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
    localStorage.setItem(ACCESS_KEY, args.access)
    if (args.refresh) localStorage.setItem(REFRESH_KEY, args.refresh)
    if (args.role) localStorage.setItem(ROLE_KEY, args.role)
    if (args.user) localStorage.setItem(USER_KEY, JSON.stringify(args.user))
  },

  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(ROLE_KEY)
    localStorage.removeItem(USER_KEY)
    // device_id intentionally survives logout (parent 2-device cap counts
    // devices, not sessions — ARCHITECTURE.md §2.2).
  },
}

/** Stable per-browser device id, required for the parent 2-device cap. */
export function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}
