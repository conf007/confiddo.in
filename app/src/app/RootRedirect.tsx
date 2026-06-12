import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth/AuthContext'
import { roleHome } from './nav'

/** "/" → role home (or /first-login, or /login). */
export function RootRedirect() {
  const { isAuthenticated, isFirstLogin, role } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (isFirstLogin) return <Navigate to="/first-login" replace />
  return <Navigate to={roleHome(role)} replace />
}
