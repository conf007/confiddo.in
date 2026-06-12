/**
 * Teacher directory: active/inactive teachers, approval queue, invite
 * codes, plus per-teacher detail (status toggle, password reset, insights).
 */
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Icon } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { ConfirmDialog } from '../../components/principal/ConfirmDialog'
import { principalKeys } from '../../components/principal/hooks'
import { formatDateTime } from '../../components/parent/format'
import {
  approveTeacher,
  generateInviteCode,
  getInviteCodes,
  getTeacherDetail,
  getTeacherDirectory,
  resetTeacherPassword,
  updateTeacherStatus,
  type InviteCode,
  type PendingApproval,
} from '../../lib/api/principal'
import { friendlyError } from '../../lib/api/errors'

export function DirectoryPage() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: principalKeys.teachers, queryFn: getTeacherDirectory })
  const codesQ = useQuery({ queryKey: principalKeys.inviteCodes, queryFn: getInviteCodes })

  const [inviteName, setInviteName] = useState('')
  const [newCode, setNewCode] = useState<InviteCode | null>(null)
  const invite = useMutation({
    mutationFn: () => generateInviteCode(inviteName.trim() || undefined),
    onSuccess: (code) => {
      setNewCode(code)
      setInviteName('')
      qc.invalidateQueries({ queryKey: principalKeys.inviteCodes })
    },
  })

  const [decision, setDecision] = useState<{ approval: PendingApproval; action: 'approve' | 'decline' } | null>(null)
  const [approveResult, setApproveResult] = useState<string | null>(null)
  const decide = useMutation({
    mutationFn: () => approveTeacher(decision!.approval.id, decision!.action),
    onSuccess: (r) => {
      setDecision(null)
      if (r.temporary_password) {
        setApproveResult(
          `${r.message} Username: ${r.username} · Temporary password: ${r.temporary_password}`,
        )
      }
      qc.invalidateQueries({ queryKey: principalKeys.teachers })
    },
  })

  if (q.isPending) return <LoadingState />
  if (q.isError)
    return <ErrorState title="Couldn't load the directory" error={q.error} onRetry={() => q.refetch()} />
  const d = q.data

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Teacher Directory</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {d.teachers.length} teachers · {d.pending_approvals.length} pending approval
          {d.pending_approvals.length === 1 ? '' : 's'}
        </p>
      </header>

      {approveResult && (
        <Card className="border-l-4 border-success bg-success-tint/40 p-5">
          <p className="text-sm leading-relaxed text-ink">{approveResult}</p>
          <p className="mt-1 text-xs text-ink-muted">
            Share these credentials securely — the teacher must change the password on first login.
          </p>
        </Card>
      )}

      {d.pending_approvals.length > 0 && (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink">Pending approvals</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {d.pending_approvals.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{p.teacher_name}</p>
                  <p className="text-xs text-ink-muted">
                    {p.requested_username}
                    {p.teacher_email && <> · {p.teacher_email}</>} ·{' '}
                    {formatDateTime(p.requested_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setDecision({ approval: p, action: 'approve' })}>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setDecision({ approval: p, action: 'decline' })}
                  >
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink">Teachers</h2>
          {d.teachers.length === 0 ? (
            <EmptyState icon="users" title="No teachers yet" description="Generate an invite code to bring teachers on board." />
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {d.teachers.map((t) => (
                <li key={t.id}>
                  <Link
                    to={`/principal/directory/${t.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-primary"
                  >
                    <span>
                      <span className="block text-sm font-medium text-ink">{t.full_name}</span>
                      <span className="block text-xs text-ink-muted">
                        {t.username}
                        {t.classes.length > 0 && <> · {t.classes.join(', ')}</>}
                      </span>
                    </span>
                    <Badge tone={t.status === 'active' ? 'success' : 'neutral'}>{t.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="h-fit p-6">
          <h2 className="text-base font-semibold text-ink">Invite codes</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            6-character codes, 7-day expiry — teachers register with one at /register/teacher.
          </p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              invite.mutate()
            }}
          >
            <Input
              placeholder="Teacher name (optional)"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
            />
            <Button type="submit" loading={invite.isPending}>
              Generate
            </Button>
          </form>
          {invite.isError && (
            <p className="mt-2 text-sm text-band-red">{friendlyError(invite.error)}</p>
          )}
          {newCode && (
            <div className="mt-4 rounded-xl bg-primary-tint p-4 text-center">
              <p className="font-mono text-2xl font-bold tracking-[0.3em] text-primary">
                {newCode.code}
              </p>
              <button
                className="mt-2 text-xs font-medium text-primary hover:underline"
                onClick={() => navigator.clipboard.writeText(newCode.code).catch(() => {})}
              >
                Copy code
              </button>
            </div>
          )}
          {(codesQ.data?.codes.length ?? 0) > 0 && (
            <ul className="mt-4 space-y-2">
              {codesQ.data!.codes.map((c) => (
                <li
                  key={c.code}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm"
                >
                  <span className="font-mono font-semibold tracking-widest text-ink">{c.code}</span>
                  <span className="text-xs text-ink-muted">
                    {c.teacher_name ?? 'Anyone'} ·{' '}
                    {Math.max(0, Math.floor(c.remaining_seconds / 86400))}d left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={decision !== null}
        title={
          decision?.action === 'approve'
            ? `Approve ${decision.approval.teacher_name}?`
            : `Decline ${decision?.approval.teacher_name ?? ''}?`
        }
        description={
          decision?.action === 'approve'
            ? 'An account will be created with a temporary password shown once.'
            : 'The request will be removed. The teacher can re-register with a new invite code.'
        }
        confirmLabel={decision?.action === 'approve' ? 'Approve' : 'Decline'}
        danger={decision?.action === 'decline'}
        loading={decide.isPending}
        onConfirm={() => decide.mutate()}
        onCancel={() => setDecision(null)}
      >
        {decide.isError && <p className="text-sm text-band-red">{friendlyError(decide.error)}</p>}
      </ConfirmDialog>
    </div>
  )
}

// ── Teacher detail ────────────────────────────────────────────────────

export function TeacherDetailPage() {
  const { teacherId = '' } = useParams()
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: principalKeys.teacherDetail(teacherId),
    queryFn: () => getTeacherDetail(teacherId),
  })

  const [confirmStatus, setConfirmStatus] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  const statusMut = useMutation({
    mutationFn: (active: boolean) => updateTeacherStatus(teacherId, active),
    onSuccess: () => {
      setConfirmStatus(false)
      qc.invalidateQueries({ queryKey: principalKeys.teacherDetail(teacherId) })
      qc.invalidateQueries({ queryKey: principalKeys.teachers })
    },
  })
  const resetMut = useMutation({
    mutationFn: () => resetTeacherPassword(teacherId),
    onSuccess: (r) => {
      setConfirmReset(false)
      setTempPassword(r.temporary_password)
    },
  })

  if (q.isPending) return <LoadingState />
  if (q.isError)
    return <ErrorState title="Couldn't load this teacher" error={q.error} onRetry={() => q.refetch()} />
  const t = q.data.teacher

  return (
    <div className="space-y-6">
      <Link
        to="/principal/directory"
        className="inline-flex h-10 items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-light"
      >
        <Icon name="arrow-left" className="h-4 w-4" />
        Directory
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t.full_name}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {t.username}
            {t.email && <> · {t.email}</>} · joined {formatDateTime(t.created_at)} · last login{' '}
            {formatDateTime(t.last_login_at)}
          </p>
        </div>
        <Badge tone={t.is_active ? 'success' : 'neutral'}>
          {t.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </header>

      {tempPassword && (
        <Card className="border-l-4 border-success bg-success-tint/40 p-5">
          <p className="text-sm text-ink">
            Temporary password: <span className="font-mono font-bold">{tempPassword}</span>
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Shown once — share it securely. The teacher must change it on next login.
          </p>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="text-base font-semibold text-ink">Classes</h2>
        {q.data.assigned_classes.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            No classes assigned yet — assign from the Classes page.
          </p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {q.data.assigned_classes.map((c) => (
              <li key={c}>
                <Badge tone="primary">{c}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-semibold text-ink">Account actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setConfirmReset(true)}>
            Reset password
          </Button>
          <Button
            variant={t.is_active ? 'danger' : 'primary'}
            onClick={() => setConfirmStatus(true)}
          >
            {t.is_active ? 'Deactivate account' : 'Reactivate account'}
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmStatus}
        title={t.is_active ? `Deactivate ${t.full_name}?` : `Reactivate ${t.full_name}?`}
        description={
          t.is_active
            ? 'They will no longer be able to sign in. Their classes and history stay intact.'
            : 'They will be able to sign in again.'
        }
        confirmLabel={t.is_active ? 'Deactivate' : 'Reactivate'}
        danger={t.is_active}
        loading={statusMut.isPending}
        onConfirm={() => statusMut.mutate(!t.is_active)}
        onCancel={() => setConfirmStatus(false)}
      />
      <ConfirmDialog
        open={confirmReset}
        title={`Reset ${t.full_name}'s password?`}
        description="A temporary password will be generated and shown once."
        confirmLabel="Reset password"
        loading={resetMut.isPending}
        onConfirm={() => resetMut.mutate()}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  )
}
