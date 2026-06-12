/**
 * Student search (paginated) and per-student detail: progress, behavioral
 * metrics (words + status, never raw values) and the journey view.
 */
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Icon } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { ReadinessChip } from '../../components/teacher/ReadinessChip'
import { principalKeys } from '../../components/principal/hooks'
import { formatDateTime } from '../../components/parent/format'
import {
  getStudentJourney,
  getStudentMetrics,
  getStudentProgress,
  searchStudents,
} from '../../lib/api/principal'

export function StudentsPage() {
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = useQuery({
    queryKey: principalKeys.students(search, page),
    queryFn: () => searchStudents(search || undefined, page),
  })

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Students</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Find a student to see their journey — readiness is always shown as words.
        </p>
      </header>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setPage(1)
          setSearch(input.trim())
        }}
      >
        <Input
          placeholder="Search by name or username…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button type="submit">
          <Icon name="search" className="h-4 w-4" />
          Search
        </Button>
      </form>

      {q.isPending ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState title="Couldn't search students" error={q.error} onRetry={() => q.refetch()} />
      ) : q.data.items.length === 0 ? (
        <EmptyState
          icon="search"
          title="No students found"
          description={search ? `Nothing matched “${search}”.` : 'No students enrolled yet.'}
        />
      ) : (
        <>
          {/* Desktop table → stacked cards on mobile */}
          <Card className="hidden overflow-x-auto p-2 md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-ink-muted">
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Class</th>
                  <th className="px-4 py-3 font-semibold">Readiness</th>
                  <th className="px-4 py-3 font-semibold">Sessions</th>
                  <th className="px-4 py-3 font-semibold">Last active</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-surface">
                    <td className="px-4 py-3">
                      <Link
                        to={`/principal/students/${s.id}`}
                        className="font-medium text-ink hover:text-primary"
                      >
                        {s.full_name}
                      </Link>
                      <span className="block text-xs text-ink-muted">{s.username}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {s.class_name ?? `Grade ${s.class_grade}`}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral">{s.readiness_label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{s.sessions_completed}</td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {formatDateTime(s.last_active)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <ul className="space-y-3 md:hidden">
            {q.data.items.map((s) => (
              <li key={s.id}>
                <Link to={`/principal/students/${s.id}`}>
                  <Card className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{s.full_name}</p>
                      <Badge tone="neutral">{s.readiness_label}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">
                      {s.class_name ?? `Grade ${s.class_grade}`} · {s.sessions_completed} sessions
                    </p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>

          {q.data.pagination.total_pages > 1 && (
            <div className="flex items-center justify-center gap-3 text-sm">
              <Button
                size="sm"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-xs text-ink-muted">
                Page {q.data.pagination.page} of {q.data.pagination.total_pages}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={page >= q.data.pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Student detail ────────────────────────────────────────────────────

type Tab = 'progress' | 'metrics' | 'journey'

const STATUS_TONE: Record<string, 'success' | 'gold' | 'accent' | 'neutral'> = {
  green: 'success',
  yellow: 'gold',
  red: 'accent',
}

export function PrincipalStudentDetailPage() {
  const { studentId = '' } = useParams()
  const [tab, setTab] = useState<Tab>('progress')
  const progressQ = useQuery({
    queryKey: principalKeys.studentProgress(studentId),
    queryFn: () => getStudentProgress(studentId),
  })

  if (progressQ.isPending) return <LoadingState />
  if (progressQ.isError)
    return (
      <ErrorState
        title="Couldn't load this student"
        error={progressQ.error}
        onRetry={() => progressQ.refetch()}
      />
    )
  const d = progressQ.data

  return (
    <div className="space-y-6">
      <Link
        to="/principal/students"
        className="inline-flex h-10 items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-light"
      >
        <Icon name="arrow-left" className="h-4 w-4" />
        Students
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{d.student.full_name}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {d.student.class_name ?? `Grade ${d.student.class_grade}`} · {d.student.username}
          </p>
        </div>
        <ReadinessChip
          level={d.readiness.current_level}
          display={d.readiness.current_level_display}
          banded
        />
      </header>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-lg font-bold text-ink">{d.activity.completed_sessions}</p>
          <p className="text-[11px] font-medium text-ink-muted">Completed sessions</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="flex items-center justify-center gap-1 text-lg font-bold text-ink">
            <Icon name="flame" className="h-4 w-4 text-accent" />
            {d.activity.current_streak_days}
          </p>
          <p className="text-[11px] font-medium text-ink-muted">Day streak</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-lg font-bold text-ink">
            {d.activity.last_active ? formatDateTime(d.activity.last_active) : '—'}
          </p>
          <p className="text-[11px] font-medium text-ink-muted">Last active</p>
        </Card>
      </div>

      <div className="flex gap-2" role="tablist">
        {(
          [
            ['progress', 'Tests'],
            ['metrics', 'Behaviors'],
            ['journey', 'Journey'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={[
              'h-11 rounded-xl px-4 text-sm font-medium transition-colors',
              tab === key
                ? 'bg-primary text-white'
                : 'bg-card text-ink-soft shadow-soft hover:bg-primary-tint hover:text-primary',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'progress' && (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink">Tests</h2>
          {d.tests.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">No tests yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {d.tests.map((t) => (
                <li key={t.test_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{t.test_title}</p>
                    <p className="text-xs text-ink-muted">
                      {t.subject} · Week {t.week_number} · {t.attempts} attempt
                      {t.attempts === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Badge tone={t.status === 'completed' ? 'success' : 'neutral'}>
                    {t.status === 'completed' ? 'Completed' : 'In progress'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      {tab === 'metrics' && <MetricsTab studentId={studentId} />}
      {tab === 'journey' && <JourneySection studentId={studentId} />}
    </div>
  )
}

function MetricsTab({ studentId }: { studentId: string }) {
  const q = useQuery({
    queryKey: principalKeys.studentMetrics(studentId),
    queryFn: () => getStudentMetrics(studentId),
  })
  if (q.isPending) return <LoadingState />
  if (q.isError)
    return <ErrorState title="Couldn't load behaviors" error={q.error} onRetry={() => q.refetch()} />
  const d = q.data
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">Behavior patterns</h2>
        <p className="text-xs text-ink-muted">
          {d.summary.green_count} strong · {d.summary.yellow_count} developing ·{' '}
          {d.summary.red_count} need support
        </p>
      </div>
      <ul className="mt-2 divide-y divide-slate-100">
        {Object.entries(d.metrics).map(([key, m]) => (
          <li key={key} className="py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-ink">{m.name}</p>
              <Badge tone={STATUS_TONE[m.status] ?? 'neutral'}>
                {m.status === 'green'
                  ? 'Strong'
                  : m.status === 'yellow'
                    ? 'Developing'
                    : m.status === 'red'
                      ? 'Needs support'
                      : 'Not enough data'}
              </Badge>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{m.interpretation}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function JourneySection({ studentId }: { studentId: string }) {
  const q = useQuery({
    queryKey: principalKeys.studentJourney(studentId),
    queryFn: () => getStudentJourney(studentId),
  })
  if (q.isPending) return <LoadingState />
  if (q.isError)
    return <ErrorState title="Couldn't load the journey" error={q.error} onRetry={() => q.refetch()} />
  const d = q.data
  return (
    <Card className="overflow-x-auto p-6">
      <h2 className="text-base font-semibold text-ink">
        {d.total_weeks} week{d.total_weeks === 1 ? '' : 's'} tracked
      </h2>
      {d.subjects.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">The journey fills in as weeks get reviewed.</p>
      ) : (
        <table className="mt-4 w-full min-w-130 border-separate border-spacing-y-2 text-left">
          <thead>
            <tr>
              <th className="pr-4 text-xs font-semibold text-ink-muted">Subject</th>
              {d.week_labels.map((w) => (
                <th key={w} className="px-2 text-center text-xs font-semibold text-ink-muted">
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.subjects.map((s) => (
              <tr key={s.name}>
                <td className="pr-4 text-sm font-medium whitespace-nowrap text-ink">
                  <span aria-hidden className="mr-1.5">{s.icon}</span>
                  {s.name}
                </td>
                {s.weeks.map((w, i) => (
                  <td key={i} className="px-2 text-center">
                    {w.child_level ? (
                      <ReadinessChip level={w.child_level} banded />
                    ) : (
                      <span className="text-xs text-ink-muted">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}
