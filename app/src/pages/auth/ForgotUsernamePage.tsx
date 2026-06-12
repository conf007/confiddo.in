import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  forgotUsername,
  forgotUsernameVerify,
  type MaskedAccount,
  type ResetRole,
} from '../../lib/api/auth'
import { friendlyError } from '../../lib/api/errors'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
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
 * 2-step flow + results (backend/app/api/password_reset.py):
 *   1. POST /forgot-username          (email or phone + role) → OTP
 *   2. POST /forgot-username/verify   → masked account list
 */
export function ForgotUsernamePage() {
  const location = useLocation()
  const initialRole = (location.state as { role?: ResetRole } | null)?.role

  const [step, setStep] = useState(0)
  const [role, setRole] = useState<ResetRole>(initialRole ?? 'student')
  const [identifier, setIdentifier] = useState('')
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [accounts, setAccounts] = useState<MaskedAccount[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const sendOtp = async () => {
    const res = await forgotUsername(identifier.trim(), role)
    setMaskedEmail(res.masked_email)
    setCooldown(RESEND_COOLDOWN_S)
  }

  const onStart = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (identifier.trim().length < 3) {
      setError('Please enter the email or phone on your account.')
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
      const res = await forgotUsernameVerify(identifier.trim(), role, otp)
      setAccounts(res.accounts)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  if (accounts) {
    return (
      <div className="space-y-4">
        <Card>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-tint text-success">
            <Icon name="check" className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-center text-2xl font-bold text-ink">
            Found {accounts.length === 1 ? 'your account' : `${accounts.length} accounts`}
          </h2>
          <p className="mt-1.5 text-center text-sm text-ink-muted">
            Usernames are partly hidden for safety.
          </p>
          <ul className="mt-5 space-y-3">
            {accounts.map((a) => (
              <li
                key={a.user_id}
                className="rounded-xl border border-slate-100 bg-surface p-4"
              >
                <p className="text-base font-semibold tracking-wider text-ink">
                  {a.masked_username}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {a.full_name}
                  {a.school_name ? ` · ${a.school_name}` : ''}
                  {a.detail ? ` · ${a.detail}` : ''}
                </p>
              </li>
            ))}
          </ul>
          <Link to="/login" className="mt-6 block">
            <Button full>Back to login</Button>
          </Link>
        </Card>
      </div>
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
        <h2 className="text-2xl font-bold text-ink">Forgot Username</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {step === 0
            ? "Enter the email or phone on your account and we'll send a code."
            : (
                <>
                  Code sent to{' '}
                  <span className="font-medium text-ink-soft">
                    {maskedEmail ?? 'your email'}
                  </span>
                  . It expires in 10 minutes.
                </>
              )}
        </p>

        {step === 0 ? (
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
              label="Email or phone"
              placeholder="you@example.com"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
            <FormError message={error} />
            <Button type="submit" full loading={busy}>
              Send code
            </Button>
          </form>
        ) : (
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
      </Card>
    </div>
  )
}
