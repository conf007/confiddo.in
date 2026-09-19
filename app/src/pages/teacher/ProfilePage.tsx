import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { EmailChangeCard } from '../../components/parent/EmailChangeCard'
import { teacherKeys } from '../../components/teacher/hooks'
import {
  getTeacherProfile,
  sendTeacherEmailChangeOtp,
  verifyTeacherEmailChange,
} from '../../lib/api/teacher'
import { useAuth } from '../../lib/auth/AuthContext'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return ((parts[0][0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase()
}

export function TeacherProfilePage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const profile = useQuery({ queryKey: teacherKeys.profile, queryFn: getTeacherProfile })

  if (profile.isLoading) return <LoadingState />
  if (!profile.data) {
    return (
      <ErrorState
        title="We couldn't load your profile"
        error={profile.error}
        onRetry={() => profile.refetch()}
        icon="user"
      />
    )
  }
  const p = profile.data

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-ink">Profile</h1>

      <Card className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-xl font-bold text-primary">
          {initials(p.full_name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-ink">{p.full_name}</p>
          <p className="text-sm text-ink-muted">Teacher</p>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-semibold text-ink">Account</h2>
        <dl className="divide-y divide-slate-100 text-sm">
          {user?.username && (
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-ink-muted">Username</dt>
              <dd className="truncate text-ink">{user.username}</dd>
            </div>
          )}
          {p.school_name && (
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-ink-muted">School</dt>
              <dd className="truncate text-ink">{p.school_name}</dd>
            </div>
          )}
          {p.subject && (
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-ink-muted">Subject</dt>
              <dd className="truncate text-ink">{p.subject}</dd>
            </div>
          )}
        </dl>
      </Card>

      <EmailChangeCard
        email={p.email}
        emailVerified={p.email_verified}
        sendOtp={sendTeacherEmailChangeOtp}
        verify={verifyTeacherEmailChange}
        onUpdated={() => void qc.invalidateQueries({ queryKey: teacherKeys.profile })}
      />

      <Card padded={false}>
        <Link
          to="/teacher/settings"
          className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 text-sm font-medium text-ink hover:bg-slate-50"
        >
          <Icon name="bell" className="h-5 w-5 text-primary" />
          Notification settings
        </Link>
        <Link
          to="/about"
          className="flex items-center gap-3 px-6 py-4 text-sm font-medium text-ink hover:bg-slate-50"
        >
          <Icon name="alert" className="h-5 w-5 text-primary" />
          About Confiddo
        </Link>
      </Card>

      <Button
        full
        variant="ghost"
        onClick={() => {
          logout()
          void navigate('/login')
        }}
      >
        <Icon name="logout" className="h-4.5 w-4.5" />
        Sign out
      </Button>
    </div>
  )
}
