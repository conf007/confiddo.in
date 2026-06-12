/**
 * /parent/profile — profile info + email change via OTP
 * (GET /parent/profile, POST /parent/profile/update-email/send-otp →
 * /verify; backend/app/api/parent.py:817-903) and the standard
 * password-recovery entry point.
 */
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { EmailChangeCard } from '../../components/parent/EmailChangeCard'
import { parentKeys } from '../../components/parent/hooks'
import {
  getParentProfile,
  sendParentEmailChangeOtp,
  verifyParentEmailChange,
} from '../../lib/api/parent'
import { useAuth } from '../../lib/auth/AuthContext'

export function ParentProfilePage() {
  const qc = useQueryClient()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const profile = useQuery({ queryKey: parentKeys.profile, queryFn: getParentProfile })

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
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-tint text-xl font-bold text-primary">
          {p.full_name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-ink">{p.full_name}</p>
          {p.phone && <p className="text-sm text-ink-muted">{p.phone}</p>}
        </div>
      </Card>

      <EmailChangeCard
        email={p.email}
        emailVerified={p.email_verified}
        sendOtp={sendParentEmailChangeOtp}
        verify={verifyParentEmailChange}
        onUpdated={() => void qc.invalidateQueries({ queryKey: parentKeys.profile })}
      />

      <Card>
        <h2 className="mb-3 text-base font-semibold text-ink">Password</h2>
        <p className="mb-4 text-xs leading-relaxed text-ink-muted">
          To change your password we'll send a one-time code to your email —
          the same safe steps as account recovery.
        </p>
        <Link to="/forgot-password">
          <Button variant="secondary" size="sm">
            <Icon name="lock" className="h-4 w-4" />
            Change password
          </Button>
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
