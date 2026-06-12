/**
 * /student/profile — profile data, character avatar, email change (OTP flow:
 * POST /student/profile/update-email/send-otp -> /verify), password change
 * entry point (the recovery OTP flow at /forgot-password, same as Flutter),
 * link-parent and XP-rules shortcuts, logout.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/icons'
import { Input } from '../../components/ui/Input'
import { Spinner } from '../../components/ui/Spinner'
import { CharacterAvatar } from '../../components/student/CharacterAvatar'
import { Sheet } from '../../components/student/Sheet'
import {
  studentKeys,
  useGamificationQuery,
  useStudentProfileQuery,
} from '../../components/student/hooks'
import { useAuth } from '../../lib/auth/AuthContext'
import { friendlyError } from '../../lib/api/errors'
import { sendEmailChangeOtp, verifyEmailChange } from '../../lib/api/student'
import { getCharacter } from '../../lib/parity'

export function StudentProfilePage() {
  const profile = useStudentProfileQuery()
  const gamification = useGamificationQuery()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [emailSheetOpen, setEmailSheetOpen] = useState(false)

  if (profile.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }
  const p = profile.data
  if (!p) {
    return (
      <p className="py-20 text-center text-sm text-ink-muted">
        {friendlyError(profile.error)}
      </p>
    )
  }

  const character = getCharacter(p.selected_character)
  const g = gamification.data

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-ink">Profile</h1>

      <Card className="flex items-center gap-4">
        <CharacterAvatar
          characterId={p.selected_character}
          glow
          sizeClassName="h-16 w-16 text-2xl"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-ink">{p.full_name}</p>
          <p className="text-sm text-ink-muted">@{p.username}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Class {p.class_grade}–{p.section}
            {p.school_name ? ` · ${p.school_name}` : ''}
          </p>
        </div>
        {g && (
          <Badge tone="accent" className="shrink-0">
            {g.level_name}
          </Badge>
        )}
      </Card>

      <Card padded={false}>
        <Link
          to="/student/characters"
          className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-slate-50"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-ink">
            <Icon name="sparkles" className="h-5 w-5 text-primary" />
            Playing as {character.name} — change character
          </span>
          <Icon name="chevron-down" className="h-4 w-4 -rotate-90 text-ink-muted" />
        </Link>
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-semibold text-ink">Email</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-ink">{p.email || 'No email yet'}</p>
            {p.email && (
              <p className="mt-0.5 text-xs">
                {p.email_verified ? (
                  <span className="text-success">Verified</span>
                ) : (
                  <span className="text-ink-muted">Not verified</span>
                )}
              </p>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={() => setEmailSheetOpen(true)}>
            {p.email ? 'Change email' : 'Add email'}
          </Button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-muted">
          Your email helps you recover your account if you forget your password.
        </p>
      </Card>

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

      <Card padded={false} className="divide-y divide-slate-100">
        <Link
          to="/student/link-parent"
          className="flex items-center gap-3 px-6 py-4 text-sm font-medium text-ink hover:bg-slate-50"
        >
          <Icon name="link" className="h-5 w-5 text-primary" />
          Link a parent
        </Link>
        <Link
          to="/student/xp-rules"
          className="flex items-center gap-3 px-6 py-4 text-sm font-medium text-ink hover:bg-slate-50"
        >
          <Icon name="flame" className="h-5 w-5 text-accent" />
          How XP works
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

      <EmailChangeSheet
        open={emailSheetOpen}
        onClose={() => setEmailSheetOpen(false)}
      />
    </div>
  )
}

function EmailChangeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [step, setStep] = useState<'email' | 'otp' | 'done'>('email')
  const [newEmail, setNewEmail] = useState('')
  const [otp, setOtp] = useState('')

  const send = useMutation({
    mutationFn: () => sendEmailChangeOtp(newEmail.trim()),
    onSuccess: () => setStep('otp'),
  })
  const verify = useMutation({
    mutationFn: () => verifyEmailChange(newEmail.trim(), otp.trim()),
    onSuccess: () => {
      setStep('done')
      void qc.invalidateQueries({ queryKey: studentKeys.profile })
    },
  })

  const close = () => {
    setStep('email')
    setNewEmail('')
    setOtp('')
    send.reset()
    verify.reset()
    onClose()
  }

  return (
    <Sheet open={open} onClose={close} title="Change email">
      {step === 'email' && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            send.mutate()
          }}
        >
          <Input
            label="New email address"
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="you@example.com"
            error={send.isError ? friendlyError(send.error) : undefined}
          />
          <Button type="submit" full loading={send.isPending} disabled={!newEmail.trim()}>
            Send verification code
          </Button>
        </form>
      )}
      {step === 'otp' && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            verify.mutate()
          }}
        >
          <p className="text-sm text-ink-soft">
            We sent a 6-digit code to <strong>{newEmail}</strong>.
          </p>
          <Input
            label="Verification code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            error={verify.isError ? friendlyError(verify.error) : undefined}
          />
          <Button type="submit" full loading={verify.isPending} disabled={otp.length !== 6}>
            Verify and update
          </Button>
          <Button type="button" variant="ghost" full onClick={() => setStep('email')}>
            Use a different email
          </Button>
        </form>
      )}
      {step === 'done' && (
        <div className="space-y-4 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-tint text-success">
            <Icon name="check" className="h-7 w-7" />
          </span>
          <p className="text-sm font-medium text-ink">Email updated!</p>
          <Button full onClick={close}>
            Done
          </Button>
        </div>
      )}
    </Sheet>
  )
}
