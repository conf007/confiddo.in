import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerTeacher } from '../../lib/api/auth'
import { friendlyError } from '../../lib/api/errors'
import { useAuth } from '../../lib/auth/AuthContext'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PasswordField } from '../../components/auth/PasswordField'
import { FormError } from '../../components/auth/FormError'
import { Icon } from '../../components/icons'

const USERNAME_RE = /^[a-zA-Z0-9_]+$/

/** Teacher self-registration with a 6-char invite code (POST /auth/teacher/register). */
export function TeacherRegisterPage() {
  const { adoptSession } = useAuth()
  const navigate = useNavigate()

  const [inviteCode, setInviteCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const validate = (): string | null => {
    if (inviteCode.trim().length !== 6)
      return 'Your invite code is 6 characters — ask your principal if you don’t have one.'
    if (fullName.trim().length < 2) return 'Please enter your full name.'
    const u = username.trim().toLowerCase()
    if (u.length < 3 || !USERNAME_RE.test(u))
      return 'Username needs at least 3 characters — letters, numbers and underscore only.'
    if (password.length < 6) return 'Password needs at least 6 characters.'
    if (password.toLowerCase() === u)
      return 'Password cannot be the same as your username.'
    if (password !== confirm) return "Passwords don't match."
    return null
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await registerTeacher({
        invite_code: inviteCode.trim().toUpperCase(),
        username: username.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      })
      adoptSession('teacher', res) // backend auto-logs-in
      navigate('/teacher', { replace: true })
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
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
        <h2 className="text-2xl font-bold text-ink">Teacher Registration</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Use the one-time invite code from your principal.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <Input
            label="Invite code"
            placeholder="e.g. 7KX2NQ"
            maxLength={6}
            autoCapitalize="characters"
            spellCheck={false}
            value={inviteCode}
            onChange={(e) =>
              setInviteCode(
                e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
              )
            }
            hint="6 characters, valid for 7 days, single use."
            className="uppercase tracking-[0.3em] font-semibold"
          />
          <Input
            label="Full name"
            placeholder="Your name as students will see it"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            label="Username"
            placeholder="Choose a username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            hint="Letters, numbers and underscore only."
          />
          <Input
            label="Email (optional)"
            type="email"
            placeholder="you@school.edu"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            hint="Recommended — needed for password recovery."
          />
          <Input
            label="Phone (optional)"
            type="tel"
            placeholder="Phone number"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <PasswordField
            label="Password"
            placeholder="At least 6 characters"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordField
            label="Confirm password"
            placeholder="Re-enter your password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={
              confirm && password !== confirm ? "Passwords don't match" : undefined
            }
          />

          <FormError message={error} />

          <Button type="submit" full loading={submitting}>
            Create account
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
