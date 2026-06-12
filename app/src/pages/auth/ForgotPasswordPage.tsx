import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  forgotPassword,
  forgotPasswordReset,
  forgotPasswordVerify,
  type ResetRole,
} from '../../lib/api/auth'
import { friendlyError } from '../../lib/api/errors'
import { passwordValid } from '../../lib/auth/passwordRules'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PasswordField } from '../../components/auth/PasswordField'
import { PasswordChecklist } from '../../components/auth/PasswordChecklist'
import { OtpField } from '../../components/auth/OtpField'
import { FormError } from '../../components/auth/FormError'
import { Icon } from '../../components/icons'

const ROLES: { value: ResetRole; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'principal', label: 'School Leader' },
]

const RESEND_COOLDOWN_S = 30

/**
 * 3-step OTP flow (backend/app/api/password_reset.py):
 *   1. POST /forgot-password           → OTP to masked email
 *   2. POST /forgot-password/verify    → reset_token
 *   3. POST /forgot-password/reset     → done
 * Resend = re-initiate (matches Flutter), 30 s client cooldown.
 */
export function ForgotPasswordPage() {
  const location = useLocation()
  const initialRole = (location.state as { role?: ResetRole } | null)?.role

  const [step, setStep] = useState(0)
  const [role, setRole] = useState<ResetRole>(initialRole ?? 'student')
  const [username, setUsername] = useState('')
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const sendOtp = async () => {
    const res = await forgotPassword(username.trim().toLowerCase(), role)
    setMaskedEmail(res.masked_email)
    setCooldown(RESEND_COOLDOWN_S)
  }

  const onStart = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (username.trim().length < 3) {
      setError('Please enter your username.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await sendOtp()
      setStep(1)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const onResend = async () => {
    if (busy || cooldown > 0) return
    setError(null)
    setBusy(true)
    try {
      await sendOtp()
      setOtp('')
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
      const res = await forgotPasswordVerify(
        username.trim().toLowerCase(),
        role,
        otp,
      )
      setResetToken(res.reset_token)
      setStep(2)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const onReset = async (e: FormEvent) => {
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
      await forgotPasswordReset(resetToken, newPassword)
      setDone(true)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <Card className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-tint text-success">
          <Icon name="check" className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-ink">Password updated</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          You're all set. Log in with your new password.
        </p>
        <Link to="/login" className="mt-6 block">
          <Button full>Back to login</Button>
        </Link>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Link
        to="/login"
        className="flex h-12 w-fit items-center gap-2 rounded-xl px-2 text-sm font-medium text-ink-muted hover:text-ink-soft"
      >
        <Icon name="arrow-left" className="h-4.5 w-4.5" />
        Back to login
      </Link>

      <Card>
        <h2 className="text-2xl font-bold text-ink">Forgot Password</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {step === 0 && "We'll email you a 6-digit code."}
          {step === 1 && (
            <>
              Code sent to{' '}
              <span className="font-medium text-ink-soft">
                {maskedEmail ?? 'your email'}
              </span>
              . It expires in 10 minutes.
            </>
          )}
          {step === 2 && 'Choose a new password.'}
        </p>

        {step === 0 && (
          <form onSubmit={onStart} className="mt-6 space-y-4" noValidate>
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink-soft">I am a</p>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={[
                      'h-10 rounded-full px-4 text-sm font-medium transition-colors',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                      role === r.value
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-ink-soft hover:bg-slate-200',
                    ].join(' ')}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="Username"
              placeholder="Enter your username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <FormError message={error} />
            <Button type="submit" full loading={busy}>
              Send code
            </Button>
          </form>
        )}

        {step === 1 && (
          <form onSubmit={onVerify} className="mt-6 space-y-4" noValidate>
            <OtpField value={otp} onChange={setOtp} disabled={busy} />
            <FormError message={error} />
            <Button type="submit" full loading={busy}>
              Verify code
            </Button>
            <p className="text-center text-sm text-ink-muted">
              Didn't receive it?{' '}
              <button
                type="button"
                onClick={onResend}
                disabled={cooldown > 0 || busy}
                className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-ink-muted"
              >
                {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
              </button>
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={onReset} className="mt-6 space-y-4" noValidate>
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
              Set new password
            </Button>
          </form>
        )}
      </Card>

      {step === 0 && (
        <p className="text-center text-sm text-ink-muted">
          Forgot your username instead?{' '}
          <Link
            to="/forgot-username"
            state={{ role }}
            className="font-medium text-primary hover:underline"
          >
            Recover it here
          </Link>
        </p>
      )}
    </div>
  )
}
