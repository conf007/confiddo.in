/**
 * Email + change-email OTP flow card, shared by the parent and principal
 * profile pages (both backends expose the identical
 * POST .../profile/update-email/send-otp → /verify pair).
 */
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Icon } from '../icons'
import { Input } from '../ui/Input'
import { friendlyError } from '../../lib/api/errors'

export function EmailChangeCard({
  email,
  emailVerified,
  sendOtp,
  verify,
  onUpdated,
}: {
  email: string | null
  emailVerified: boolean
  sendOtp: (newEmail: string) => Promise<{ message: string }>
  verify: (newEmail: string, otpCode: string) => Promise<unknown>
  onUpdated: () => void
}) {
  const [step, setStep] = useState<'closed' | 'email' | 'otp' | 'done'>('closed')
  const [newEmail, setNewEmail] = useState('')
  const [otp, setOtp] = useState('')

  const send = useMutation({
    mutationFn: () => sendOtp(newEmail.trim()),
    onSuccess: () => setStep('otp'),
  })
  const confirm = useMutation({
    mutationFn: () => verify(newEmail.trim(), otp.trim()),
    onSuccess: () => {
      setStep('done')
      onUpdated()
    },
  })

  const reset = () => {
    setStep('closed')
    setNewEmail('')
    setOtp('')
    send.reset()
    confirm.reset()
  }

  return (
    <Card>
      <h2 className="mb-3 text-base font-semibold text-ink">Email</h2>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-ink">{email || 'No email yet'}</p>
          {email && (
            <p className="mt-0.5 text-xs">
              {emailVerified ? (
                <span className="text-success">Verified</span>
              ) : (
                <span className="text-ink-muted">Not verified</span>
              )}
            </p>
          )}
        </div>
        {step === 'closed' && (
          <Button variant="secondary" size="sm" onClick={() => setStep('email')}>
            {email ? 'Change email' : 'Add email'}
          </Button>
        )}
      </div>

      {step === 'email' && (
        <form
          className="mt-4 space-y-4"
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
          <div className="flex gap-2">
            <Button type="submit" loading={send.isPending} disabled={!newEmail.trim()}>
              Send verification code
            </Button>
            <Button type="button" variant="ghost" onClick={reset}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {step === 'otp' && (
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            confirm.mutate()
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
            error={confirm.isError ? friendlyError(confirm.error) : undefined}
          />
          <div className="flex gap-2">
            <Button type="submit" loading={confirm.isPending} disabled={otp.length !== 6}>
              Verify and update
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep('email')}>
              Use a different email
            </Button>
          </div>
        </form>
      )}

      {step === 'done' && (
        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-tint text-success">
            <Icon name="check" className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium text-ink">Email updated!</p>
          <Button variant="ghost" size="sm" onClick={reset}>
            Done
          </Button>
        </div>
      )}
    </Card>
  )
}
