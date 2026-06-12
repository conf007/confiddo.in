/**
 * Classes list with teacher assignment, plus per-class detail
 * (readiness distribution + confidence metrics + notify teacher).
 */
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { ConfirmDialog } from '../../components/principal/ConfirmDialog'
import { MetricHealthRow } from '../../components/principal/MetricHealthRow'
import { principalKeys } from '../../components/principal/hooks'
import {
  assignTeacherToClass,
  getClassMetrics,
  getClassReadinessDetail,
  getPrincipalClasses,
  getTeacherDirectory,
  notifyClassTeacher,
  unassignTeacherFromClass,
  type NotifyMessageType,
  type PrincipalClass,
} from '../../lib/api/principal'
import { friendlyError } from '../../lib/api/errors'

export function PrincipalClassesPage() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: principalKeys.classes, queryFn: getPrincipalClasses })
  const teachersQ = useQuery({
    queryKey: principalKeys.teachers,
    queryFn: getTeacherDirectory,
  })
  const [assigning, setAssigning] = useState<PrincipalClass | null>(null)
  const [teacherId, setTeacherId] = useState('')
  const [unassign, setUnassign] = useState<{ cls: PrincipalClass; teacherId: string; name: string } | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: principalKeys.classes })
  const assignMut = useMutation({
    mutationFn: () => assignTeacherToClass(assigning!.id, teacherId),
    onSuccess: () => {
      setAssigning(null)
      setTeacherId('')
      invalidate()
    },
  })
  const unassignMut = useMutation({
    mutationFn: () => unassignTeacherFromClass(unassign!.cls.id, unassign!.teacherId),
    onSuccess: () => {
      setUnassign(null)
      invalidate()
    },
  })

  if (q.isPending) return <LoadingState />
  if (q.isError)
    return <ErrorState title="Couldn't load classes" error={q.error} onRetry={() => q.refetch()} />

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Classes</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Assignments, sections and student counts.
        </p>
      </header>

      {q.data.classes.length === 0 ? (
        <EmptyState icon="school" title="No classes yet" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {q.data.classes.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    to={`/principal/classes/${c.id}`}
                    className="text-base font-semibold text-ink hover:text-primary"
                  >
                    {c.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Grade {c.grade}-{c.section} · {c.subject} · {c.student_count} students
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setAssigning(c)}>
                  Assign teacher
                </Button>
              </div>
              {c.teachers.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {c.teachers.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 text-ink-soft">
                        {t.full_name}
                        {t.is_primary && <Badge tone="primary">Primary</Badge>}
                        <Badge
                          tone={
                            t.status === 'accepted'
                              ? 'success'
                              : t.status === 'rejected'
                                ? 'accent'
                                : 'neutral'
                          }
                        >
                          {t.status}
                        </Badge>
                      </span>
                      <button
                        className="text-xs font-medium text-band-red hover:underline"
                        onClick={() => setUnassign({ cls: c, teacherId: t.id, name: t.full_name })}
                      >
                        Unassign
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={assigning !== null}
        title={`Assign a teacher to ${assigning?.name ?? ''}`}
        confirmLabel="Assign"
        loading={assignMut.isPending}
        onConfirm={() => teacherId && assignMut.mutate()}
        onCancel={() => setAssigning(null)}
      >
        <select
          aria-label="Teacher"
          className="h-12 w-full rounded-xl border border-slate-200 bg-card px-3 text-sm text-ink"
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
        >
          <option value="">Choose a teacher…</option>
          {teachersQ.data?.teachers
            .filter((t) => t.status === 'active')
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
        </select>
        {assignMut.isError && (
          <p className="mt-2 text-sm text-band-red">{friendlyError(assignMut.error)}</p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={unassign !== null}
        title={`Unassign ${unassign?.name ?? ''}?`}
        description={`They will no longer manage ${unassign?.cls.name ?? 'this class'}.`}
        confirmLabel="Unassign"
        danger
        loading={unassignMut.isPending}
        onConfirm={() => unassignMut.mutate()}
        onCancel={() => setUnassign(null)}
      />
    </div>
  )
}

// ── Class detail ──────────────────────────────────────────────────────

const NOTIFY_OPTIONS: { value: NotifyMessageType; label: string }[] = [
  { value: 'attention_needed', label: 'Attention needed' },
  { value: 'encouragement', label: 'Encouragement' },
  { value: 'doing_well', label: 'Class is doing well' },
  { value: 'review_reminder', label: 'Review reminder' },
  { value: 'general', label: 'General note' },
]

export function PrincipalClassDetailPage() {
  const { classId = '' } = useParams()
  const readinessQ = useQuery({
    queryKey: principalKeys.classReadiness(classId),
    queryFn: () => getClassReadinessDetail(classId),
  })
  const metricsQ = useQuery({
    queryKey: principalKeys.classMetrics(classId),
    queryFn: () => getClassMetrics(classId),
  })
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [messageType, setMessageType] = useState<NotifyMessageType>('encouragement')
  const [note, setNote] = useState('')
  const notify = useMutation({
    mutationFn: () => notifyClassTeacher(classId, messageType, note.trim() || undefined),
    onSuccess: () => {
      setNotifyOpen(false)
      setNote('')
    },
  })

  if (readinessQ.isPending) return <LoadingState />
  if (readinessQ.isError)
    return (
      <ErrorState
        title="Couldn't load this class"
        error={readinessQ.error}
        onRetry={() => readinessQ.refetch()}
      />
    )
  const d = readinessQ.data
  const dist = [
    { key: 'avoidant', cls: 'bg-band-red/70', ...d.distribution.avoidant },
    { key: 'attempting', cls: 'bg-band-yellow/70', ...d.distribution.attempting },
    { key: 'practicing', cls: 'bg-slate-400/70', ...d.distribution.practicing },
    { key: 'confident_plus', cls: 'bg-band-green', ...d.distribution.confident_plus },
  ]
  const max = Math.max(1, ...dist.map((x) => x.count))

  return (
    <div className="space-y-6">
      <Link
        to="/principal/classes"
        className="inline-flex h-10 items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-light"
      >
        <Icon name="arrow-left" className="h-4 w-4" />
        All classes
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            {d.class_name} · {d.subject}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {d.period} · {d.total_students} students assessed ·{' '}
            {d.teacher_name ? `Teacher: ${d.teacher_name}` : 'No teacher assigned'}
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={!d.teacher_assigned}
          onClick={() => setNotifyOpen(true)}
        >
          <Icon name="message" className="h-4 w-4" />
          Notify teacher
        </Button>
      </header>

      <Card className="p-6">
        <h2 className="text-base font-semibold text-ink">Readiness distribution</h2>
        <ul className="mt-4 space-y-2">
          {dist.map((row) => (
            <li key={row.key} className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-xs font-medium text-ink-soft">{row.label}</span>
              <span className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span
                  className={`block h-full rounded-full ${row.cls}`}
                  style={{ width: `${(row.count / max) * 100}%` }}
                />
              </span>
              <span className="w-8 text-right text-sm font-semibold text-ink">{row.count}</span>
            </li>
          ))}
        </ul>
      </Card>

      {metricsQ.data && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-base font-semibold text-ink">Confidence metrics</h2>
            <ul className="mt-2 divide-y divide-slate-100">
              {Object.entries(metricsQ.data.metrics).map(([key, m]) => (
                <MetricHealthRow key={key} metric={m} />
              ))}
            </ul>
          </Card>
          <div className="space-y-5">
            {metricsQ.data.weak_areas.length > 0 && (
              <Card className="border-l-4 border-band-yellow p-6">
                <h2 className="text-base font-semibold text-ink">Where support helps</h2>
                <ul className="mt-3 space-y-2.5">
                  {metricsQ.data.weak_areas.map((w) => (
                    <li key={w.metric} className="text-sm leading-relaxed text-ink-soft">
                      <span className="font-medium text-ink">{w.name}:</span> {w.recommendation}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {metricsQ.data.strong_areas.length > 0 && (
              <Card className="border-l-4 border-success p-6">
                <h2 className="text-base font-semibold text-ink">Strengths</h2>
                <ul className="mt-3 space-y-1.5">
                  {metricsQ.data.strong_areas.map((s) => (
                    <li key={s.metric} className="flex items-center gap-2 text-sm text-ink-soft">
                      <Icon name="check" className="h-4 w-4 text-success" />
                      {s.name}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={notifyOpen}
        title={`Message ${d.teacher_name ?? 'the class teacher'}`}
        confirmLabel="Send"
        loading={notify.isPending}
        onConfirm={() => notify.mutate()}
        onCancel={() => setNotifyOpen(false)}
      >
        <div className="space-y-3">
          <select
            aria-label="Message type"
            className="h-12 w-full rounded-xl border border-slate-200 bg-card px-3 text-sm text-ink"
            value={messageType}
            onChange={(e) => setMessageType(e.target.value as NotifyMessageType)}
          >
            {NOTIFY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <textarea
            aria-label="Optional note"
            placeholder="Optional note…"
            className="min-h-24 w-full rounded-xl border border-slate-200 bg-card p-3 text-sm text-ink"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {notify.isError && (
            <p className="text-sm text-band-red">{friendlyError(notify.error)}</p>
          )}
        </div>
      </ConfirmDialog>
    </div>
  )
}
