/**
 * Auth state for the whole app.
 *
 * - login(role, credentials): per-role POST /auth/{role}/login; parent logins
 *   carry device_id (2-device cap) + a readable device_name.
 * - Session hydrates from tokenStore (survives reloads).
 * - Listens for 'confiddo:logout' fired by client.ts when a token refresh
 *   fails (tokens already cleared there).
 * - is_first_login → pages redirect to /first-login; completeFirstLogin()
 *   flips the local flag after POST /auth/password-reset/first-login/reset.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { tokenStore, deviceId, type Role } from './tokens'
import * as authApi from '../api/auth'
import type { AnyProfile, LoginRequest, LoginResponse } from '../api/auth'

interface Session {
  role: Role
  user: AnyProfile | null
}

export interface AuthContextValue {
  role: Role | null
  user: AnyProfile | null
  isAuthenticated: boolean
  isFirstLogin: boolean
  login: (
    role: Role,
    credentials: { username: string; password: string },
  ) => Promise<LoginResponse>
  /** Install a session from any LoginResponse (e.g. register endpoints). */
  adoptSession: (role: Role, data: LoginResponse) => void
  /** Mark the mandatory first-login reset as done (local flag only). */
  completeFirstLogin: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Human-readable device name for the parent session list. */
function webDeviceName(): string {
  const ua = navigator.userAgent
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Browser'
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad/.test(ua)
        ? 'iOS'
        : /Mac/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Web'
  return `${browser} on ${os}`
}

function profileFromResponse(data: LoginResponse): AnyProfile | null {
  return (
    data.student ??
    data.teacher ??
    data.parent ??
    data.principal ??
    data.admin ??
    null
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const role = tokenStore.role
    if (!tokenStore.access || !role) return null
    return { role, user: tokenStore.user as AnyProfile | null }
  })

  // client.ts clears tokens + fires this event when a 401 refresh fails.
  useEffect(() => {
    const onForcedLogout = () => setSession(null)
    window.addEventListener('confiddo:logout', onForcedLogout)
    return () => window.removeEventListener('confiddo:logout', onForcedLogout)
  }, [])

  const adoptSession = useCallback((role: Role, data: LoginResponse) => {
    const profile = profileFromResponse(data)
    const user = profile
      ? {
          ...profile,
          // top-level flag is authoritative (api/auth.py LoginResponse)
          is_first_login: data.is_first_login ?? profile.is_first_login ?? false,
        }
      : null
    tokenStore.save({
      access: data.access_token,
      refresh: data.refresh_token,
      role,
      user: user ?? undefined,
    })
    setSession({ role, user })
  }, [])

  const login = useCallback(
    async (
      role: Role,
      credentials: { username: string; password: string },
    ): Promise<LoginResponse> => {
      const body: LoginRequest = {
        username: credentials.username.trim().toLowerCase(),
        password: credentials.password,
      }
      if (role === 'parent') {
        body.device_id = deviceId()
        body.device_name = webDeviceName()
      }
      const data = await authApi.login(role, body)
      adoptSession(role, data)
      return data
    },
    [adoptSession],
  )

  const completeFirstLogin = useCallback(() => {
    setSession((prev) => {
      if (!prev?.user) return prev
      const user = { ...prev.user, is_first_login: false }
      const access = tokenStore.access
      if (access) tokenStore.save({ access, role: prev.role, user })
      return { ...prev, user }
    })
  }, [])

  const logout = useCallback(() => {
    // Best-effort server call (stateless on the backend), then local clear.
    void authApi.logout().catch(() => {})
    tokenStore.clear()
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      role: session?.role ?? null,
      user: session?.user ?? null,
      isAuthenticated: session !== null,
      isFirstLogin: session?.user?.is_first_login === true,
      login,
      adoptSession,
      completeFirstLogin,
      logout,
    }),
    [session, login, adoptSession, completeFirstLogin, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
