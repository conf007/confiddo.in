import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth/AuthContext'
import type { Role } from '../lib/auth/tokens'
import { roleHome } from './nav'

export interface RequireRoleProps {
  role: Role
  children: ReactNode
}

/**
 * Role gate for layout routes:
 *  - unauthenticated → /login (remembers where you were headed)
 *  - pending mandatory first-login reset → /first-login
 *  - wrong role → that role's own home
 */
export function RequireRole({ role, children }: RequireRoleProps) {
  const auth = useAuth()
  const location = useLocation()

  if (!auth.isAuthenticated) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    )
  }
  if (auth.isFirstLogin) {
    return <Navigate to="/first-login" replace />
  }
  if (auth.role !== role) {
    return <Navigate to={roleHome(auth.role)} replace />
  }
  return <>{children}</>
}
