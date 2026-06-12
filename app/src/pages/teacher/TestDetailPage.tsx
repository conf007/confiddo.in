/**
 * /teacher/tests/:testId — test detail (Flutter parity:
 * test_status_screen.dart per-test view + test_content_screen.dart).
 *
 * Endpoints:
 *   GET  /teacher/tests/{id}/attempt-status (teacher.py:448-462)
 *   GET  /teacher/paper/{id}                (teacher.py:887-899) — content
 *   POST /teacher/paper/{id}/publish        (teacher.py:902-937) — drafts only
 *   POST /teacher/tests/{id}/remind[...]    (teacher.py:469-519)
 *
 * The deadline is rendered verbatim from the server (ARCHITECTURE.md §9.9).
 */
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { teacherKeys } from '../../components/teacher/hooks'
import {
  getTestAsPaper,
  getTestAttemptStatus,
  publishDraftTest,
  remindStudents,
} from '../../lib/api/teacher'
import { friendlyError } from '../../lib/api/errors'

const LIFECYCLE = ['draft', 'live', 'review', 'completed'] as const

function StatusTimeline({ status }: { status: string }) {
  const idx = LIFECYCLE.indexOf(status as (typeof LIFECYCLE)[number])
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {LIFECYCLE.map((s, i) => {
        const reached = idx >= 0 && i <= idx
        return (
          <li key={s} className="flex items-center gap-2">
            <span
              className={[
                'flex h-6 items-center rounded-full px-2.5 font-medium capitalize',
                i === idx
                  ? 'bg-primary text-white'
                  : reached
                    ? 'bg-primary-tint text-primary'
                    : 'bg-slate-100 text-ink-muted',
              ].join(' ')}
            >
              {s === 'review' ? 'In review' : s}
            </span>
            {i < LIFECYCLE.length - 1 && <span className="text-slate-300">→</span>}
          </li>
        )
      })}
    </ol>
  )
}

export function TestDetailPage() {
  const { testId = '' } = useParams()
  const queryClient = useQueryClient()
  const [showAnswers, setShowAnswers] = useState(false)

  const paper = useQuery({
    queryKey: teacherKeys.testPaper(testId),
    queryFn: () => getTestAsPaper(testId),
    enabled: !!testId,
  })
  const attempts = useQuery({
    queryKey: teacherKeys.attemptStatus(testId),
    queryFn: () => getTestAttemptStatus(testId),
    enabled: !!testId && paper.data?.status !== 'draft',
  })

  const publish = useMutation({
    mutationFn: () => publishDraftTest(testId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.testPaper(testId) })
      queryClient.invalidateQueries({ queryKey: teacherKeys.myTests })
    },
  })
  const remind = useMutation({
    mutationFn: (studentIds?: string[]) => remindStudents(testId, studentIds),
  })

  if (paper.isLoading) return <LoadingState />
  if (!paper.data) {
    return (
      <ErrorState
        title="We couldn't load this test"
        error={paper.error}
        onRetry={() => paper.refetch()}
        icon="clipboard"
      />
    )
  }

  const p = paper.data
  const a = attempts.data
  const isDraft = p.status === 'draft'
  const allFinished =
    !!a && a.total_students > 0 && a.completed.length >= a.total_students

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          to="/teacher/tests"
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink"
        >
          <Icon name="arrow-left" className="h-3.5 w-3.5" />
          All tests
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">{p.title}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {p.class_name && `${p.class_name} • `}
              {p.subject} • {p.duration_minutes} min
            </p>
          </div>
          {isDraft && (
            <div className="flex gap-2">
              <Link to={`/teacher/paper/new?testId=${p.test_id}`}>
                <Button size="sm" variant="secondary">Edit questions</Button>
              </Link>
              <Button
                size="sm"
                onClick={() => publish.mutate()}
                loading={publish.isPending}
              >
                Publish
              </Button>
            </div>
          )}
        </div>
        {publish.error && (
          <p className="mt-2 text-sm text-band-red">{friendlyError(publish.error)}</p>
        )}
      </div>

      <Card className="space-y-3">
        <StatusTimeline status={p.status} />
        {a?.deadline && (
          <p className="text-sm text-ink-soft">
            <span className="font-medium text-ink">Deadline:</span>{' '}
            {new Date(a.deadline).toLocaleString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </Card>

      {/* Completion buckets */}
      {!isDraft && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">Student progress</h2>
            {a && (
              <span className="text-xs text-ink-soft">
                {a.completed.length} of {a.total_students} finished
                {allFinished && (
                  <span className="ml-1.5 font-medium text-success">
                    — all students finished
                  </span>
                )}
              </span>
            )}
          </div>
          {attempts.isLoading ? (
            <p className="mt-3 text-sm text-ink-muted">Loading progress…</p>
          ) : !a ? (
            <p className="mt-3 text-sm text-ink-muted">
              {friendlyError(attempts.error, 'Progress is unavailable right now.')}
            </p>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                    Not started ({a.not_started.length})
                  </h3>
                  {a.not_started.length > 0 && p.status === 'live' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remind.mutate(undefined)}
                      loading={remind.isPending}
                    >
                      Remind all
                    </Button>
                  )}
                </div>
                {remind.data && (
                  <p className="mb-2 text-xs text-success">
                    Reminder sent to {remind.data.sent} student
                    {remind.data.sent === 1 ? '' : 's'}
                    {remind.data.skipped > 0 &&
                      ` (${remind.data.skipped} already reminded today)`}
                  </p>
                )}
                {remind.error && (
                  <p className="mb-2 text-xs text-band-red">
                    {friendlyError(remind.error)}
                  </p>
                )}
                <ul className="space-y-1.5">
                  {a.not_started.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-lg bg-surface px-3 py-2 text-sm text-ink-soft"
                    >
                      {s.full_name}
                    </li>
                  ))}
                  {a.not_started.length === 0 && (
                    <li className="text-sm text-ink-muted">Everyone has started.</li>
                  )}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                  In progress ({a.in_progress.length})
                </h3>
                <ul className="space-y-1.5">
                  {a.in_progress.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm"
                    >
                      <span className="text-ink-soft">{s.full_name}</span>
                      <span className="text-xs text-ink-muted">
                        Q{s.current_question_number}/{s.total_questions}
                      </span>
                    </li>
                  ))}
                  {a.in_progress.length === 0 && (
                    <li className="text-sm text-ink-muted">No one mid-test.</li>
                  )}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                  Completed ({a.completed.length})
                </h3>
                <ul className="space-y-1.5">
                  {a.completed.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between rounded-lg bg-success-tint/60 px-3 py-2 text-sm"
                    >
                      <span className="text-ink-soft">{s.full_name}</span>
                      <Icon name="check" className="h-4 w-4 text-success" />
                    </li>
                  ))}
                  {a.completed.length === 0 && (
                    <li className="text-sm text-ink-muted">No completions yet.</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Content */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Questions</h2>
          <Button size="sm" variant="ghost" onClick={() => setShowAnswers((v) => !v)}>
            <Icon name={showAnswers ? 'eye-off' : 'eye'} className="h-4 w-4" />
            {showAnswers ? 'Hide answers' : 'Show answers'}
          </Button>
        </div>
        <div className="mt-3 space-y-5">
          {p.sections.map((section) => (
            <div key={section.name}>
              {p.sections.length > 1 && (
                <Badge tone="neutral" className="mb-2">{section.name}</Badge>
              )}
              <ol className="space-y-3">
                {section.questions.map((q) => (
                  <li key={q.number} className="rounded-xl border border-slate-100 p-4">
                    <p className="text-sm leading-relaxed text-ink">
                      <span className="mr-1.5 font-semibold text-ink-muted">
                        {q.number}.
                      </span>
                      {q.text}
                    </p>
                    {q.options && q.options.length > 0 && (
                      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                        {q.options.map((opt, i) => (
                          <li key={i} className="text-xs text-ink-soft">
                            <span className="font-semibold text-ink-muted">
                              {String.fromCharCode(65 + i)}.
                            </span>{' '}
                            {opt}
                          </li>
                        ))}
                      </ul>
                    )}
                    {showAnswers && q.expected_answer && (
                      <p className="mt-2 text-xs text-success">
                        <span className="font-semibold">Answer:</span> {q.expected_answer}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
