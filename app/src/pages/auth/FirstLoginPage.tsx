import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  firstLoginEmailInfo,
  firstLoginReset,
  firstLoginSendEmailOtp,
  firstLoginVerifyEmail,
  type EmailInfo,
} from '../../lib/api/auth'
import { friendlyError } from '../../lib/api/errors'
import { useAuth } from '../../lib/auth/AuthContext'
import { passwordValid } from '../../lib/auth/passwordRules'
import { roleHome } from '../../app/nav'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { PasswordField } from '../../components/auth/PasswordField'
import { PasswordChecklist } from '../../components/auth/PasswordChecklist'
import { OtpField } from '../../components/auth/OtpField'
import { FormError } from '../../components/auth/FormError'
import { Icon } from '../../components/icons'

const RESEND_COOLDOWN_S = 30

function StepDot({
  index,
  label,
  current,
}: {
  index: number
  label: string
  current: number
}) {
  const active = current >= index
  const done = current > index
  return (
    <div className="flex items-center gap-2">
      <span
        className={[
          'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
          active ? 'bg-primary text-white' : 'bg-slate-100 text-ink-muted',
        ].join(' ')}
      >
        {done ? <Icon name="check" className="h-4 w-4" /> : index + 1}
      </span>
      <span
        className={`text-xs font-medium ${active ? 'text-ink-soft' : 'text-ink-muted'}`}
      >
        {label}
      </span>
    </div>
  )
}

/**
 * Mandatory first-login flow (all roles, backend/app/api/password_reset.py):
 *   Step 1 — POST /first-login/reset       (new password, policy-checked)
 *   Step 2 — POST /first-login/email-info  → send-email-otp → verify-email
 *            (skippable when no email is on file, like the Flutter screen)
 */
export function FirstLoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  // Capture at mount: once the reset succeeds the flag flips, but the user
  // stays here to finish email verification.
  const [startedAsFirstLogin] = useState(auth.isFirstLogin)

  const [step, setStep] = useState(0)
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const [emailInfo, setEmailInfo] = useState<EmailInfo | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [verified, setVerified] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // Load email info when arriving at step 2.
  useEffect(() => {
    if (step !== 1 || emailInfo) return
    let cancelled = false
    firstLoginEmailInfo()
      .then((info) => {
        if (!cancelled) setEmailInfo(info)
      })
      .catch((err) => {
        if (!cancelled) setError(friendlyError(err))
      })
    return () => {
      cancelled = true
    }
  }, [step, emailInfo])

  if (!auth.isAuthenticated) return <Navigate to="/login" replace />
  if (!startedAsFirstLogin) return <Navigate to={roleHome(auth.role)} replace />

  const home = roleHome(auth.role)

  const onSetPassword = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!passwordValid(newPassword)) {
      setError('Please meet all the password requirements below.')
      return
    }
    if (newPassword !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setError(null)
    setBusy(true)
    try {
      await firstLoginReset(newPassword)
      auth.completeFirstLogin() // backend flipped is_first_login = false
      setStep(1)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const onSendOtp = async () => {
    if (busy || cooldown > 0) return
    setError(null)
    setBusy(true)
    try {
      await firstLoginSendEmailOtp()
      setOtpSent(true)
      setOtp('')
      setCooldown(RESEND_COOLDOWN_S)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const onVerify = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code from your email.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await firstLoginVerifyEmail(otp)
      setVerified(true)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-tint text-primary">
          <Icon name="lock" className="h-7 w-7" />
        </div>
        <h2 className="mt-3 text-2xl font-bold text-ink">Secure Your Account</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Set a new password to get started
        </p>
      </div>

      <div className="flex items-center justify-center gap-3">
        <StepDot index={0} label="Password" current={step} />
        <span className="h-px w-8 bg-slate-200" />
        <StepDot index={1} label="Email" current={step} />
      </div>

      <Card>
        {step === 0 && (
          <form onSubmit={onSetPassword} className="space-y-4" noValidate>
            <h3 className="text-lg font-semibold text-ink">
              Create New Password
            </h3>
            <PasswordField
              label="New password"
              placeholder="Enter your new password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <PasswordChecklist password={newPassword} />
            <PasswordField
              label="Confirm password"
              placeholder="Re-enter your new password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={
                confirm && newPassword !== confirm
                  ? "Passwords don't match"
                  : undefined
              }
            />
            <FormError message={error} />
            <Button type="submit" full loading={busy}>
              Next
            </Button>
          </form>
        )}

        {step === 1 && !emailInfo && !error && (
          <div className="flex items-center justify-center gap-3 py-10 text-ink-muted">
            <Spinner className="h-5 w-5" />
            <span className="text-sm">Checking your account…</span>
          </div>
        )}

        {step === 1 && verified && (
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-tint text-success">
              <Icon name="check" className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-ink">
              Email verified!
            </h3>
            <p className="mt-1.5 text-sm text-ink-muted">
              Your email has been successfully verified.
            </p>
            <Button
              full
              className="mt-6"
              onClick={() => navigate(home, { replace: true })}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 1 && !verified && emailInfo && !emailInfo.has_email && (
          <div className="space-y-4 text-center">
            <h3 className="text-lg font-semibold text-ink">
              No email on your account
            </h3>
            <p className="text-sm leading-relaxed text-ink-muted">
              Contact your school administrator to add your email. Your new
              password is saved — but email verification is needed for
              password recovery later.
            </p>
            <FormError message={error} />
            <Button
              full
              variant="secondary"
              onClick={() => navigate(home, { replace: true })}
            >
              Continue Without Email
            </Button>
          </div>
        )}

        {step === 1 && !verified && emailInfo?.has_email && (
          <form onSubmit={onVerify} className="space-y-4" noValidate>
            <h3 className="text-lg font-semibold text-ink">Verify Your Email</h3>
            <p className="text-sm text-ink-muted">
              We'll send a verification code to{' '}
              <span className="font-medium text-ink-soft">
                {emailInfo.masked_email ?? '***@***.***'}
              </span>
            </p>
            {!otpSent ? (
              <>
                <FormError message={error} />
                <Button full loading={busy} onClick={onSendOtp}>
                  <Icon name="mail" className="h-4.5 w-4.5" />
                  Send Code
                </Button>
              </>
            ) : (
              <>
                <OtpField value={otp} onChange={setOtp} disabled={busy} />
                <p className="text-center text-xs text-ink-muted">
                  Code expires in 10 minutes
                </p>
                <FormError message={error} />
                <Button type="submit" full loading={busy}>
                  Verify
                </Button>
                <p className="text-center text-sm text-ink-muted">
                  Didn't receive it?{' '}
                  <button
                    type="button"
                    onClick={onSendOtp}
                    disabled={cooldown > 0 || busy}
                    className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-ink-muted"
                  >
                    {cooldown > 0
                      ? `Resend Code (${cooldown}s)`
                      : 'Resend Code'}
                  </button>
                </p>
              </>
            )}
          </form>
        )}
      </Card>
    </div>
  )
}
