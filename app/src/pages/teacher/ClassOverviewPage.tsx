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
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { LevelPicker } from '../../components/teacher/LevelPicker'
import { ReadinessChip } from '../../components/teacher/ReadinessChip'
import { teacherKeys } from '../../components/teacher/hooks'
import {
  getClassOverview,
  getClassStudentGroups,
  getClassTests,
  modifyStudentLevel,
  type ClassTestReviewInfo,
  type GroupedStudent,
  type ReadinessCode,
} from '../../lib/api/teacher'
import { ApiError } from '../../lib/api/client'
import { friendlyError } from '../../lib/api/errors'

function levelChangeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'NO_COMPLETED_REVIEW') return 'Finish this week’s review before changing a level.'
    if (e.code === 'MODIFICATION_LOCKED') return 'A newer review is complete — earlier levels are locked.'
  }
  return friendlyError(e)
}

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

function LevelChangePanel({
  student,
  classId,
  onDone,
}: {
  student: GroupedStudent
  classId: string
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const [picked, setPicked] = useState<ReadinessCode | null>(null)
  const change = useMutation({
    mutationFn: (level: ReadinessCode) => modifyStudentLevel(classId, student.id, level),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.studentGroups(classId) })
      onDone()
    },
  })
  return (
    <div className="space-y-3 border-t border-slate-100 bg-surface px-6 py-4" data-testid="level-change">
      <p className="text-sm text-ink-soft">
        Change <span className="font-semibold text-ink">{student.full_name}</span>’s level
        {' '}(now <ReadinessChip level={student.level} display={student.level_display} />)
      </p>
      <LevelPicker value={picked} onChange={setPicked} name={`level-${student.id}`} />
      {change.error && <p className="text-xs text-band-red">{levelChangeError(change.error)}</p>}
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!picked || picked === student.level}
          loading={change.isPending}
          onClick={() => picked && change.mutate(picked)}
        >
          Save level
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function ClassTestsCard({ classId }: { classId: string }) {
  const tests = useQuery({
    queryKey: teacherKeys.classTests(classId),
    queryFn: () => getClassTests(classId),
    enabled: !!classId,
  })
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <Card>
      <h2 className="text-sm font-semibold text-ink">All tests for this class</h2>
      {tests.isLoading ? (
        <p className="mt-3 text-sm text-ink-muted">Loading tests…</p>
      ) : !tests.data ? (
        <p className="mt-3 text-sm text-ink-muted">{friendlyError(tests.error, 'Tests are unavailable right now.')}</p>
      ) : tests.data.tests.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No tests assigned to this class yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {tests.data.tests.map((t) => {
            const open = openId === t.id
            return (
              <li key={t.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{t.title}</p>
                    <p className="text-xs text-ink-muted">
                      {t.total_questions} question{t.total_questions === 1 ? '' : 's'}
                      {t.created_by_name && ` • by ${t.created_by_name}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : t.id)}
                    className="inline-flex min-h-10 items-center gap-1 text-xs font-medium text-primary hover:text-primary-light"
                  >
                    <Icon name="chevron-down" className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
                    {open ? 'Hide questions' : 'Questions'}
                  </button>
                  <Link to={`/teacher/tests/${t.id}`} className="text-xs font-medium text-primary hover:text-primary-light">
                    Status
                  </Link>
                </div>
                {open && (
                  <ol className="mt-3 space-y-2">
                    {t.questions.map((q, i) => (
                      <li key={q.id} className="rounded-xl bg-surface px-4 py-3 text-sm text-ink">
                        <span className="mr-1.5 font-semibold text-ink-muted">{i + 1}.</span>
                        {q.text}
                        {q.topic && <Badge tone="outline" className="ml-2">{q.topic}</Badge>}
                        {q.options.length > 0 && (
                          <ul className="mt-2 grid gap-1 text-xs text-ink-soft sm:grid-cols-2">
                            {q.options.map((o, j) => (
                              <li key={o.id} className={o.is_correct ? 'font-medium text-success' : ''}>
                                <span className="font-semibold text-ink-muted">{String.fromCharCode(65 + j)}.</span> {o.text}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

export function ClassOverviewPage() {
  const { classId = '' } = useParams()
  const [editingId, setEditingId] = useState<string | null>(null)
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
  const canModify = groups.data?.can_modify === true
  const editing = students.find((s) => s.id === editingId) ?? null

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
            <Link to={`/teacher/classes/${info.id}/history`}>
              <Button size="sm" variant="ghost">
                <Icon name="check" className="h-4 w-4" />
                Past reviews
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
          <span className="flex items-center gap-2">
            {canModify && <Badge tone="primary">Levels editable</Badge>}
            {groups.data && (
              <Badge tone="neutral">{groups.data.week_label}</Badge>
            )}
          </span>
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
                        {canModify && (
                          <button
                            type="button"
                            onClick={() => setEditingId(editingId === s.id ? null : s.id)}
                            className="mr-4 text-xs font-medium text-primary hover:text-primary-light"
                          >
                            Change level
                          </button>
                        )}
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
                <li key={s.id} className="flex items-center gap-2 px-4">
                  <Link
                    to={`/teacher/students/${s.id}?classId=${classId}`}
                    className="flex min-h-12 min-w-0 flex-1 items-center justify-between gap-3 py-3"
                  >
                    <span className="truncate text-sm font-medium text-ink">
                      {s.full_name}
                    </span>
                    <ReadinessChip level={s.level} display={s.level_display} />
                  </Link>
                  {canModify && (
                    <button
                      type="button"
                      aria-label={`Change level for ${s.full_name}`}
                      onClick={() => setEditingId(editingId === s.id ? null : s.id)}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-primary hover:bg-slate-50"
                    >
                      <Icon name="settings" className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {editing && canModify && (
              <LevelChangePanel
                key={editing.id}
                student={editing}
                classId={classId}
                onDone={() => setEditingId(null)}
              />
            )}
          </>
        )}
      </Card>

      <ClassTestsCard classId={classId} />
    </div>
  )
}
