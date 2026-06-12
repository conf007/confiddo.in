import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth/AuthContext'
import type { Role } from '../../lib/auth/tokens'
import { friendlyError } from '../../lib/api/errors'
import { roleHome } from '../../app/nav'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PasswordField } from '../../components/auth/PasswordField'
import { FormError } from '../../components/auth/FormError'
import { Icon, type IconName } from '../../components/icons'

interface RoleOption {
  role: Role
  title: string
  subtitle: string
  icon: IconName
  tile: string
}

// Mirrors frontend/lib/presentation/screens/auth/role_selection_screen.dart
const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'student',
    title: "I'm a student",
    subtitle: 'Practice & track your progress',
    icon: 'backpack',
    tile: 'bg-primary-tint text-primary',
  },
  {
    role: 'parent',
    title: "I'm a parent",
    subtitle: "Monitor your child's learning",
    icon: 'users',
    tile: 'bg-success-tint text-success',
  },
  {
    role: 'teacher',
    title: "I'm a teacher",
    subtitle: 'Create sessions & view insights',
    icon: 'book',
    tile: 'bg-accent-tint text-accent',
  },
  {
    role: 'principal',
    title: "I'm a school leader",
    subtitle: 'Oversee school-wide readiness',
    icon: 'school',
    tile: 'bg-primary-tint text-primary',
  },
]

// Copy mirrored from login_screen.dart
const ROLE_FORM_COPY: Record<
  string,
  { title: string; subtitle: string; encouragement: string }
> = {
  student: {
    title: 'Student Login',
    subtitle: 'Practice with confidence',
    encouragement: 'No pressure. Just practice at your own pace!',
  },
  parent: {
    title: 'Parent Login',
    subtitle: "Monitor your child's progress",
    encouragement: 'See how your child is growing in confidence!',
  },
  teacher: {
    title: 'Teacher Login',
    subtitle: 'Empower your students',
    encouragement: 'Track progress and support student growth!',
  },
  principal: {
    title: 'School Leader Login',
    subtitle: 'Lead with insights',
    encouragement: 'Track progress and support student growth!',
  },
}

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [role, setRole] = useState<Role | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Already signed in → straight to the right home.
  if (auth.isAuthenticated) {
    return (
      <Navigate
        to={auth.isFirstLogin ? '/first-login' : roleHome(auth.role)}
        replace
      />
    )
  }

  const pickRole = (r: Role) => {
    setRole(r)
    setError(null)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!role || submitting) return
    if (username.trim().length < 3) {
      setError('Please enter your username (at least 3 characters).')
      return
    }
    if (password.length < 6) {
      setError('Please enter your password (at least 6 characters).')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await auth.login(role, { username, password })
      if (res.is_first_login) {
        navigate('/first-login', { replace: true })
      } else {
        const from = (location.state as { from?: string } | null)?.from
        navigate(from && from.startsWith(roleHome(role)) ? from : roleHome(role), {
          replace: true,
        })
      }
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Stage 1: role picker ────────────────────────────────────────────
  if (!role) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-ink">
            How are you using Confiddo?
          </h2>
          <p className="mt-1.5 text-sm text-ink-muted">
            Pick your role to sign in
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.role}
              type="button"
              onClick={() => pickRole(opt.role)}
              className="flex items-center gap-4 rounded-card bg-card p-4 text-left shadow-soft transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${opt.tile}`}
              >
                <Icon name={opt.icon} className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  {opt.title}
                </span>
                <span className="block truncate text-xs text-ink-muted">
                  {opt.subtitle}
                </span>
              </span>
            </button>
          ))}
        </div>
        <p className="text-center text-xs leading-relaxed text-ink-muted">
          New here?{' '}
          <Link
            to="/register/parent"
            className="font-medium text-primary hover:underline"
          >
            Create a parent account
          </Link>{' '}
          or{' '}
          <Link
            to="/register/teacher"
            className="font-medium text-primary hover:underline"
          >
            register as a teacher
          </Link>
          . Student accounts come from your school.
        </p>
      </div>
    )
  }

  // ── Stage 2: credential form ────────────────────────────────────────
  const copy = ROLE_FORM_COPY[role] ?? ROLE_FORM_COPY.student

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          setRole(null)
          setError(null)
        }}
        className="flex h-12 items-center gap-2 rounded-xl px-2 text-sm font-medium text-ink-muted hover:text-ink-soft focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Icon name="arrow-left" className="h-4.5 w-4.5" />
        Choose a different role
      </button>

      <Card>
        <h2 className="text-2xl font-bold text-ink">{copy.title}</h2>
        <p className="mt-1 text-sm text-ink-muted">{copy.subtitle}</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <Input
            label="Username"
            placeholder="Enter your username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            hint={
              role === 'student'
                ? 'Usually your roll or registration number from your teacher.'
                : undefined
            }
          />
          <PasswordField
            label="Password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              state={{ role }}
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          <FormError message={error} />

          <Button type="submit" full loading={submitting}>
            Log In
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-ink-muted">
          {copy.encouragement}
        </p>
      </Card>

      <div className="space-y-1.5 text-center text-sm">
        {role === 'teacher' && (
          <p className="text-ink-muted">
            New teacher?{' '}
            <Link
              to="/register/teacher"
              className="font-medium text-primary hover:underline"
            >
              Register with an invite code
            </Link>
          </p>
        )}
        {role === 'parent' && (
          <p className="text-ink-muted">
            New here?{' '}
            <Link
              to="/register/parent"
              className="font-medium text-primary hover:underline"
            >
              Create a parent account
            </Link>
          </p>
        )}
        <p className="text-ink-muted">
          Forgot your username?{' '}
          <Link
            to="/forgot-username"
            state={{ role }}
            className="font-medium text-primary hover:underline"
          >
            Recover it here
          </Link>
        </p>
      </div>
    </div>
  )
}
