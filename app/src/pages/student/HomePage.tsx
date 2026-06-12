/**
 * /student — tests grouped by subject with session status, resume CTA and
 * warm empty states. Data: GET /student/tests (TestWithSessionStatus).
 *
 * Deadline note: the server's student test list carries no deadline field
 * today (backend/app/schemas/test.py:112-114). When the backend adds one we
 * render it VERBATIM (never recomputed — ARCHITECTURE.md §9.9); until then
 * cards show week + duration, and lateness is flagged by the server at
 * session start (is_late + late_message).
 */
import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/icons'
import { Spinner } from '../../components/ui/Spinner'
import {
  useStudentProfileQuery,
  useStudentTestsQuery,
} from '../../components/student/hooks'
import { friendlyError } from '../../lib/api/errors'
import type { StudentTest } from '../../lib/api/student'

/** Server deadline rendered verbatim; null-safe (field not sent today). */
function deadlineLabel(deadline?: string | null): string | null {
  if (!deadline) return null
  const due = new Date(deadline)
  if (Number.isNaN(due.getTime())) return null
  const msLeft = due.getTime() - Date.now()
  const days = Math.ceil(msLeft / 86_400_000)
  if (msLeft < 0) return 'Past due — you can still submit'
  if (days <= 1) return 'Due today'
  return `Due in ${days} days`
}

function statusBadge(test: StudentTest) {
  const overdue = test.deadline ? new Date(test.deadline).getTime() < Date.now() : false
  if (test.session_status === 'completed') return <Badge tone="success">Completed</Badge>
  if (test.session_status === 'in_progress') return <Badge tone="accent">In progress</Badge>
  if (overdue) return <Badge tone="neutral">Late — still open</Badge>
  return <Badge tone="primary">New</Badge>
}

function TestCard({ test }: { test: StudentTest }) {
  const due = deadlineLabel(test.deadline)
  const cta =
    test.session_status === 'in_progress'
      ? 'Resume'
      : test.session_status === 'completed'
        ? 'Review'
        : 'Start'
  return (
    <Card className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base leading-snug font-semibold text-ink">{test.title}</h3>
        {statusBadge(test)}
      </div>
      <p className="text-xs text-ink-muted">
        Week {test.week_number}
        {test.teacher_name ? ` · ${test.teacher_name}` : ''}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1">
          <Icon name="clipboard" className="h-3.5 w-3.5 text-ink-muted" />
          {test.total_questions} questions
        </span>
        <span className="inline-flex items-center gap-1">
          <Icon name="chart" className="h-3.5 w-3.5 text-ink-muted" />
          ~{test.estimated_duration_minutes} min
        </span>
        {due && <span className="text-accent">{due}</span>}
      </div>
      <div className="mt-auto pt-2">
        <Link to={`/student/tests/${test.id}/start`}>
          <Button
            full
            variant={test.session_status === 'completed' ? 'secondary' : 'primary'}
          >
            {cta}
          </Button>
        </Link>
      </div>
    </Card>
  )
}

export function StudentHomePage() {
  const tests = useStudentTestsQuery()
  const profile = useStudentProfileQuery()

  if (tests.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  if (tests.isError) {
    return (
      <EmptyState
        icon="alert"
        title="We couldn't load your tests"
        description={friendlyError(tests.error)}
        action={
          <Button variant="secondary" onClick={() => tests.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }

  const allTests = tests.data?.tests ?? []
  const inProgress = allTests.filter((t) => t.session_status === 'in_progress')
  const firstName = profile.data?.full_name?.split(' ')[0]

  // Group by subject, preserving server order within each group
  const bySubject = new Map<string, StudentTest[]>()
  for (const test of allTests) {
    const list = bySubject.get(test.subject) ?? []
    list.push(test)
    bySubject.set(test.subject, list)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            {firstName ? `Hi ${firstName}!` : 'Welcome back!'}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            No pressure — just practice at your own pace.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/student/link-parent"
            className="inline-flex h-12 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-ink-muted hover:bg-slate-50 hover:text-ink-soft"
          >
            <Icon name="link" className="h-4 w-4" />
            Link a parent
          </Link>
          <Link
            to="/student/profile"
            className="inline-flex h-12 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-ink-muted hover:bg-slate-50 hover:text-ink-soft"
          >
            <Icon name="user" className="h-4 w-4" />
            Profile
          </Link>
        </div>
      </div>

      {inProgress.length > 0 && (
        <Card className="flex flex-col items-start justify-between gap-4 border border-primary/15 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
              <Icon name="backpack" className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">
                Pick up where you left off
              </p>
              <p className="text-xs text-ink-muted">
                {inProgress[0].title} · {inProgress[0].subject}
              </p>
            </div>
          </div>
          <Link to={`/student/tests/${inProgress[0].id}/start`} className="w-full sm:w-auto">
            <Button full>Resume test</Button>
          </Link>
        </Card>
      )}

      {allTests.length === 0 ? (
        <EmptyState
          icon="sparkles"
          title="No tests yet — enjoy the calm"
          description="When your teacher publishes a practice test, it will appear right here. Check back soon!"
        />
      ) : (
        [...bySubject.entries()].map(([subject, subjectTests]) => {
          const done = subjectTests.filter((t) => t.session_status === 'completed').length
          return (
            <section key={subject} aria-label={subject}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-tint text-primary">
                    <Icon name="book" className="h-4.5 w-4.5" />
                  </span>
                  <h2 className="text-base font-semibold text-ink">{subject}</h2>
                </div>
                <Badge tone="neutral">
                  {done}/{subjectTests.length} done
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {subjectTests.map((test) => (
                  <TestCard key={test.id} test={test} />
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
