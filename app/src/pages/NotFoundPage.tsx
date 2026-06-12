import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth/AuthContext'
import { roleHome } from '../app/nav'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/Logo'

export function NotFoundPage() {
  const { isAuthenticated, role } = useAuth()
  const home = isAuthenticated ? roleHome(role) : '/login'

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-surface px-6 text-center">
      <Logo />
      <div>
        <p className="text-6xl font-bold text-primary/20">404</p>
        <h1 className="mt-2 text-xl font-semibold text-ink">
          This page wandered off
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
          The page you're looking for doesn't exist or has moved.
        </p>
      </div>
      <Link to={home}>
        <Button>{isAuthenticated ? 'Back to my home' : 'Go to login'}</Button>
      </Link>
    </div>
  )
}
