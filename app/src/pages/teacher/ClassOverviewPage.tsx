/**
 * /teacher/classes/:classId — class overview (Flutter parity:
 * class_overview_screen.dart + teacher_student_list_screen.dart).
 *
 * Endpoints:
 *   GET /teacher/classes/{id}/overview       (teacher.py:84-103)
 *   GET /teacher/classes/{id}/student-groups (teacher.py:1159-1173)
 *
 * Privacy: the students table shows name + readiness WORD only — the
 * backend returns no per-student scores here and the web mirrors that
 * (no "last active" either; the teacher API does not expose one).
 */
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { ReadinessChip } from '../../components/teacher/ReadinessChip'
import { teacherKeys } from '../../components/teacher/hooks'
import {
  getClassOverview,
  getClassStudentGroups,
  type ClassTestReviewInfo,
} from '../../lib/api/teacher'

const WEEKLY_LABEL: Record<string, string> = {
  no_tests: 'No tests to review this week',
  not_started: 'Weekly review not started',
  partial: 'Weekly review in progress',
  all_reviewed: 'All reviews done for this week',
}

function TestRow({ test, classId }: { test: ClassTestReviewInfo; classId: string }) {
  const finished =
    test.student_count > 0 && test.submissions >= test.student_count
  return (
    <li className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{test.test_title}</p>
        <p className="text-xs text-ink-muted">
          {test.submissions} of {test.student_count} student
          {test.student_count === 1 ? '' : 's'} finished
          {finished && (
            <span className="ml-1.5 font-medium text-success">
              • all students finished
            </span>
          )}
        </p>
      </div>
      {test.status === 'live' && <Badge tone="primary">Live</Badge>}
      {test.status === 'completed' && (
        <Badge tone="success">
          <Icon name="check" className="h-3 w-3" />
          Reviewed
        </Badge>
      )}
      {test.status === 'claimed_by_other' && (
        <Badge tone="neutral">Reviewed by a colleague</Badge>
      )}
      {(test.status === 'not_started' || test.status === 'in_progress') && (
        <Link to={`/teacher/classes/${classId}/review?test=${test.test_id}`}>
          <Button size="sm" variant={test.status === 'in_progress' ? 'secondary' : 'primary'}>
            {test.status === 'in_progress' ? 'Continue review' : 'Start review'}
          </Button>
        </Link>
      )}
      <Link
        to={`/teacher/tests/${test.test_id}`}
        className="text-xs font-medium text-primary hover:text-primary-light"
      >
        Details
      </Link>
    </li>
  )
}

export function ClassOverviewPage() {
  const { classId = '' } = useParams()
  const overview = useQuery({
    queryKey: teacherKeys.classOverview(classId),
    queryFn: () => getClassOverview(classId),
    enabled: !!classId,
  })
  const groups = useQuery({
    queryKey: teacherKeys.studentGroups(classId),
    queryFn: () => getClassStudentGroups(classId),
    enabled: !!classId,
  })

  if (overview.isLoading) return <LoadingState />
  if (!overview.data) {
    return (
      <ErrorState
        title="We couldn't load this class"
        error={overview.error}
        onRetry={() => overview.refetch()}
        icon="school"
      />
    )
  }

  const { class_info: info, tests, weekly_summary: weekly } = overview.data
  const students =
    groups.data?.groups.flatMap((g) =>
      g.students.map((s) => ({ ...s, groupDisplay: g.level_display })),
    ) ?? []

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          to="/teacher"
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink"
        >
          <Icon name="arrow-left" className="h-3.5 w-3.5" />
          My classes
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">{info.name}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Grade {info.grade} • {info.subject} • {info.student_count} student
              {info.student_count === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/teacher/paper/new?classId=${info.id}`}>
              <Button size="sm">
                <Icon name="book" className="h-4 w-4" />
                Create test
              </Button>
            </Link>
            <Link to={`/teacher/analytics?classId=${info.id}`}>
              <Button size="sm" variant="secondary">
                <Icon name="chart-line" className="h-4 w-4" />
                Analytics
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Weekly review status */}
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={[
              'flex h-10 w-10 items-center justify-center rounded-xl',
              weekly.status === 'all_reviewed'
                ? 'bg-success-tint text-success'
                : 'bg-primary-tint text-primary',
            ].join(' ')}
          >
            <Icon name={weekly.status === 'all_reviewed' ? 'check' : 'clipboard'} className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">
              {WEEKLY_LABEL[weekly.status] ?? weekly.status}
            </p>
            <p className="text-xs text-ink-muted">
              {weekly.tests_reviewed} of {weekly.tests_total} test
              {weekly.tests_total === 1 ? '' : 's'} reviewed this week
            </p>
          </div>
        </div>
      </Card>

      {/* Tests */}
      <Card>
        <h2 className="text-sm font-semibold text-ink">Current tests</h2>
        {tests.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            No live or review-stage tests for this class right now.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {tests.map((t) => (
              <TestRow key={`${t.test_id}-${t.status}`} test={t} classId={classId} />
            ))}
          </ul>
        )}
      </Card>

      {/* Students */}
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-5 pb-3">
          <h2 className="text-sm font-semibold text-ink">Students</h2>
          {groups.data && (
            <Badge tone="neutral">{groups.data.week_label}</Badge>
          )}
        </div>
        {groups.isLoading ? (
          <div className="flex justify-center py-10">
            <span className="text-sm text-ink-muted">Loading students…</span>
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            icon="users"
            title="No students yet"
            description="Students will appear here once they're enrolled in this class."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-y border-slate-100 text-xs text-ink-muted">
                    <th className="px-6 py-2.5 font-medium">Name</th>
                    <th className="px-6 py-2.5 font-medium">Readiness</th>
                    <th className="px-6 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-ink">{s.full_name}</td>
                      <td className="px-6 py-3">
                        <ReadinessChip level={s.level} display={s.level_display} />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          to={`/teacher/students/${s.id}?classId=${classId}`}
                          className="text-xs font-medium text-primary hover:text-primary-light"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {students.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/teacher/students/${s.id}?classId=${classId}`}
                    className="flex min-h-12 items-center justify-between gap-3 px-4 py-3"
                  >
                    <span className="truncate text-sm font-medium text-ink">
                      {s.full_name}
                    </span>
                    <ReadinessChip level={s.level} display={s.level_display} />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  )
}
