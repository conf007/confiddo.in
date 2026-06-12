/** Principal profile: school info, email change (shared OTP card), logout. */
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { EmailChangeCard } from '../../components/parent/EmailChangeCard'
import { principalKeys } from '../../components/principal/hooks'
import {
  getPrincipalProfile,
  sendPrincipalEmailChangeOtp,
  verifyPrincipalEmailChange,
} from '../../lib/api/principal'
import { useAuth } from '../../lib/auth/AuthContext'

export function PrincipalProfilePage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const q = useQuery({
    queryKey: principalKeys.profile,
    queryFn: getPrincipalProfile,
  })
  if (q.isPending) return <LoadingState />
  if (q.isError)
    return <ErrorState title="Couldn't load your profile" error={q.error} onRetry={() => q.refetch()} />
  const p = q.data

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Profile</h1>
      </header>
      <Card className="p-6">
        <p className="text-lg font-semibold text-ink">{p.full_name}</p>
        <p className="mt-1 text-sm text-ink-muted">School Leader</p>
        {p.school_name && (
          <p className="mt-3 text-sm text-ink-soft">
            {p.school_name}
            {p.school_code && <> · code {p.school_code}</>}
          </p>
        )}
      </Card>
      <EmailChangeCard
        email={p.email}
        emailVerified={p.email_verified}
        sendOtp={sendPrincipalEmailChangeOtp}
        verify={verifyPrincipalEmailChange}
        onUpdated={() => qc.invalidateQueries({ queryKey: principalKeys.profile })}
      />
      <Button
        variant="danger"
        full
        onClick={() => {
          logout()
          navigate('/login')
        }}
      >
        Log out
      </Button>
    </div>
  )
}
