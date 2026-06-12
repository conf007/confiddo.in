/**
 * /teacher/tests — tests by lifecycle status (Flutter parity:
 * test_status_screen.dart + dashboard "My Tests").
 *
 * Endpoints:
 *   GET /teacher/my-tests                     (teacher.py:57-68)
 *   GET /teacher/tests/{id}/attempt-status    (teacher.py:448-462) —
 *       per-test "x of N students" completion progress.
 */
import { Link } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { TestStatusBadge } from '../../components/teacher/TestStatusBadge'
import { teacherKeys } from '../../components/teacher/hooks'
import {
  getMyTests,
  getTestAttemptStatus,
  type TeacherTestSummary,
  type TestAttemptStatus,
} from '../../lib/api/teacher'

const STATUS_ORDER = ['review', 'live', 'draft', 'completed']

function Progress({
  test,
  attempts,
}: {
  test: TeacherTestSummary
  attempts?: TestAttemptStatus
}) {
  if (test.status === 'draft') {
    return <span className="text-xs text-ink-muted">Not published yet</span>
  }
  if (!attempts) {
    return (
      <span className="text-xs text-ink-muted">
        {test.submission_count} submission{test.submission_count === 1 ? '' : 's'}
      </span>
    )
  }
  const done = attempts.completed.length
  const total = attempts.total_students
  const allFinished = total > 0 && done >= total
  return (
    <span className="flex items-center gap-2 text-xs">
      <span className="text-ink-soft">
        {done} of {total} students
      </span>
      {allFinished && (
        <span className="inline-flex items-center gap-1 font-medium text-success">
          <Icon name="check" className="h-3 w-3" />
          All finished
        </span>
      )}
    </span>
  )
}

export function TestStatusPage() {
  const tests = useQuery({ queryKey: teacherKeys.myTests, queryFn: getMyTests })

  const trackable = (tests.data?.tests ?? []).filter(
    (t) => t.status !== 'draft' && t.class_id,
  )
  const attemptQueries = useQueries({
    queries: trackable.map((t) => ({
      queryKey: teacherKeys.attemptStatus(t.id),
      queryFn: () => getTestAttemptStatus(t.id),
      staleTime: 60_000,
    })),
  })
  const attemptsByTest = new Map<string, TestAttemptStatus>()
  trackable.forEach((t, i) => {
    const data = attemptQueries[i]?.data
    if (data) attemptsByTest.set(t.id, data)
  })

  if (tests.isLoading) return <LoadingState />
  if (!tests.data) {
    return (
      <ErrorState
        title="We couldn't load your tests"
        error={tests.error}
        onRetry={() => tests.refetch()}
        icon="clipboard"
      />
    )
  }

  const sorted = [...tests.data.tests].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  )

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Tests</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Draft → live → review → completed. Track who's finished each test.
          </p>
        </div>
        <Link to="/teacher/paper/new">
          <Button>
            <Icon name="book" className="h-4 w-4" />
            Create test
          </Button>
        </Link>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon="clipboard"
          title="No tests yet"
          description="Create your first test from the question bank — it takes about a minute."
          action={
            <Link to="/teacher/paper/new">
              <Button>Create a test</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card padded={false} className="hidden md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-ink-muted">
                  <th className="px-6 py-3 font-medium">Test</th>
                  <th className="px-6 py-3 font-medium">Class</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Progress</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="max-w-60 px-6 py-3">
                      <p className="truncate font-medium text-ink">{t.title}</p>
                      <p className="text-xs text-ink-muted">
                        {t.subject} • {t.actual_questions || t.total_questions} questions
                        {t.status === 'live' &&
                          ` • ${t.days_remaining}d remaining`}
                      </p>
                    </td>
                    <td className="px-6 py-3 text-ink-soft">{t.class_name ?? '—'}</td>
                    <td className="px-6 py-3">
                      <TestStatusBadge status={t.status} />
                    </td>
                    <td className="px-6 py-3">
                      <Progress test={t} attempts={attemptsByTest.get(t.id)} />
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        to={
                          t.status === 'draft'
                            ? `/teacher/paper/new?testId=${t.id}`
                            : `/teacher/tests/${t.id}`
                        }
                        className="text-xs font-medium text-primary hover:text-primary-light"
                      >
                        {t.status === 'draft' ? 'Resume' : 'View'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {sorted.map((t) => (
              <Link
                key={t.id}
                to={
                  t.status === 'draft'
                    ? `/teacher/paper/new?testId=${t.id}`
                    : `/teacher/tests/${t.id}`
                }
                className="block"
              >
                <Card className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-medium text-ink">
                      {t.title}
                    </p>
                    <TestStatusBadge status={t.status} />
                  </div>
                  <p className="text-xs text-ink-muted">
                    {t.class_name ?? t.subject} •{' '}
                    {t.actual_questions || t.total_questions} questions
                  </p>
                  <Progress test={t} attempts={attemptsByTest.get(t.id)} />
                </Card>
              </Link>
            ))}
          </div>

          <p className="text-xs text-ink-muted">
            <Badge tone="outline" className="mr-1.5">Tip</Badge>
            Tests move to “Needs review” automatically when every student
            finishes, or after the deadline passes.
          </p>
        </>
      )}
    </div>
  )
}
