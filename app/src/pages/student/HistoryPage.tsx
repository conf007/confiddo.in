import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/icons'
import { Spinner } from '../../components/ui/Spinner'
import { useAcademicSessionsQuery, useStudentTestsQuery } from '../../components/student/hooks'
import { friendlyError } from '../../lib/api/errors'
import type { AcademicSession } from '../../lib/api/student'

function SessionBlock({ session, byTestId }: { session: AcademicSession; byTestId: Map<string, string> }) {
  const subjects = session.subjects.filter((s) => s.tests.length > 0)
  return (
    <section aria-label={`${session.academic_year} · Class ${session.class_grade}-${session.section}`} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">
          {session.academic_year} · Class {session.class_grade}–{session.section}
        </h2>
        {session.school_name && <span className="text-xs text-ink-muted">{session.school_name}</span>}
      </div>
      {subjects.length === 0 && <p className="text-sm text-ink-muted">No tests in this year yet.</p>}
      {subjects.map((subject) => (
        <Card key={subject.id} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-tint text-primary">
                <Icon name="book" className="h-4.5 w-4.5" />
              </span>
              <h3 className="text-sm font-semibold text-ink">{subject.name}</h3>
            </div>
            <Badge tone="neutral">
              {subject.completed_tests}/{subject.total_tests} done
            </Badge>
          </div>
          <ul className="divide-y divide-slate-100">
            {subject.tests.map((t) => {
              const status = t.is_completed ? 'completed' : t.is_in_progress ? 'in_progress' : 'not_started'
              const startHref = `/student/tests/${t.id}/start`
              return (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{t.title}</p>
                    <p className="text-xs text-ink-muted">
                      Week {t.week_number}
                      {byTestId.get(t.id) ? ` · ${byTestId.get(t.id)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {status === 'completed' && (
                      <>
                        <Badge tone="success">Completed</Badge>
                        <Link to={`/student/tests/${t.id}/results`}>
                          <Button size="sm" variant="secondary">
                            Review
                          </Button>
                        </Link>
                        <Link to={startHref}>
                          <Button size="sm" variant="ghost">
                            Revise
                          </Button>
                        </Link>
                      </>
                    )}
                    {status === 'in_progress' && (
                      <>
                        <Badge tone="accent">In progress</Badge>
                        <Link to={startHref}>
                          <Button size="sm">Resume</Button>
                        </Link>
                      </>
                    )}
                    {status === 'not_started' && (
                      <Link to={startHref}>
                        <Button size="sm" variant="secondary">
                          Start
                        </Button>
                      </Link>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      ))}
    </section>
  )
}

export function HistoryPage() {
  const history = useAcademicSessionsQuery()
  const tests = useStudentTestsQuery()

  if (history.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }
  if (!history.data) {
    return (
      <EmptyState
        icon="alert"
        title="Couldn't load past tests"
        description={friendlyError(history.error)}
        action={
          <Button variant="secondary" onClick={() => history.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }

  const byTestId = new Map<string, string>()
  for (const t of tests.data?.tests ?? []) if (t.teacher_name) byTestId.set(t.id, t.teacher_name)
  const sessions = history.data.sessions
  const anyTests = sessions.some((s) => s.subjects.some((sub) => sub.tests.length > 0))

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">My past tests</h1>
          <p className="mt-1 text-sm text-ink-muted">By year and subject.</p>
        </div>
        <Link
          to="/student"
          className="inline-flex h-12 items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink-soft"
        >
          <Icon name="arrow-left" className="h-4 w-4" />
          Home
        </Link>
      </div>

      {!anyTests ? (
        <EmptyState
          icon="clipboard"
          title="No tests yet"
          description="Finished tests show up here."
          action={
            <Link to="/student">
              <Button variant="secondary">Back to home</Button>
            </Link>
          }
        />
      ) : (
        sessions.map((s) => (
          <SessionBlock key={`${s.academic_year}-${s.class_grade}-${s.section}`} session={s} byTestId={byTestId} />
        ))
      )}
    </div>
  )
}
