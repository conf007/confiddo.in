/**
 * /student/tests/:testId/start — invitation page.
 *
 * Mode resolution (mirrors backend sessions.py:72-110 + Flutter invitation
 * screen):
 *   not_started -> Start (mode=continue creates a session)
 *   in_progress -> Resume (continue) or Start fresh (reattempt; the server
 *                  deducts -3 XP "abandoned_session" when one existed)
 *   completed   -> Revision (review XP) / Practice again (reattempt; XP for
 *                  this test is only earned once per week) / View results.
 * Server gates handled here:
 *   PARENT_NOT_LOGGED_IN (403)  -> friendly explainer + link-parent CTA
 *   TEST_ALREADY_COMPLETED (400)-> flip UI to the completed options
 * Late submissions: allowed but flagged — when create returns is_late we
 * surface the server's late_message before entering the questions.
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/icons'
import { Spinner } from '../../components/ui/Spinner'
import { useStudentTestsQuery } from '../../components/student/hooks'
import { ApiError } from '../../lib/api/client'
import { friendlyError } from '../../lib/api/errors'
import {
  createSession,
  type CreateSessionResponse,
  type SessionMode,
} from '../../lib/api/sessions'
import { initTracked } from './session/tracker'

export function TestStartPage() {
  const { testId = '' } = useParams()
  const navigate = useNavigate()
  const tests = useStudentTestsQuery()
  const [parentGate, setParentGate] = useState(false)
  const [completedGate, setCompletedGate] = useState(false)
  const [lateSession, setLateSession] = useState<CreateSessionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const test = tests.data?.tests.find((t) => t.id === testId)

  const enterSession = (session: CreateSessionResponse) => {
    initTracked({
      sessionId: session.session_id,
      testId,
      totalQuestions: session.total_questions,
      isRevision: session.is_revision,
      isLate: session.is_late,
      lateMessage: session.late_message,
      testTitle: test?.title,
      subject: test?.subject,
    })
    const startAt = Math.min(
      Math.max(1, session.current_question_number || 1),
      session.total_questions,
    )
    void navigate(`/student/sessions/${session.session_id}/q/${startAt}`, {
      replace: true,
    })
  }

  const start = useMutation({
    mutationFn: (mode: SessionMode) => createSession(testId, mode),
    onSuccess: (session) => {
      setError(null)
      if (session.is_late && session.late_message) {
        setLateSession(session) // pause on the notice; continue button below
      } else {
        enterSession(session)
      }
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'PARENT_NOT_LOGGED_IN') {
        setParentGate(true)
      } else if (e instanceof ApiError && e.code === 'TEST_ALREADY_COMPLETED') {
        setCompletedGate(true)
      } else {
        setError(friendlyError(e))
      }
    },
  })

  if (tests.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  if (!test) {
    return (
      <EmptyState
        icon="alert"
        title="We couldn't find that test"
        description="It may have been unpublished. Head back home to see your current tests."
        action={
          <Link to="/student">
            <Button variant="secondary">Back to home</Button>
          </Link>
        }
      />
    )
  }

  // ── Parent gate (403 PARENT_NOT_LOGGED_IN) ──────────────────────────
  if (parentGate) {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-tint text-primary">
            <Icon name="users" className="h-7 w-7" />
          </span>
          <h1 className="text-xl font-bold text-ink">One quick step first</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
            Your parent needs to log in to their Confiddo app once before you
            can start tests. It keeps them part of your journey — they see
            your effort, never your answers.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/student/link-parent">
              <Button full>
                <Icon name="link" className="h-4.5 w-4.5" />
                Get a linking code
              </Button>
            </Link>
            <Button variant="secondary" onClick={() => setParentGate(false)}>
              Back
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // ── Late notice (session created; pause before entering) ───────────
  if (lateSession) {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-tint text-accent">
            <Icon name="alert" className="h-7 w-7" />
          </span>
          <h1 className="text-xl font-bold text-ink">A little past the deadline</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
            {lateSession.late_message}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
            Practicing late is far better than not practicing at all.
          </p>
          <div className="mt-6">
            <Button onClick={() => enterSession(lateSession)}>Continue anyway</Button>
          </div>
        </Card>
      </div>
    )
  }

  const isCompleted = test.session_status === 'completed' || completedGate
  const isInProgress = test.session_status === 'in_progress' && !completedGate

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        to="/student"
        className="inline-flex h-12 items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink-soft"
      >
        <Icon name="arrow-left" className="h-4 w-4" />
        Back to home
      </Link>

      <Card className="text-center">
        <Badge tone="primary" className="mb-3">
          {test.subject} · Week {test.week_number}
        </Badge>
        <h1 className="text-2xl font-bold text-ink">{test.title}</h1>
        {test.description && (
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
            {test.description}
          </p>
        )}
        <div className="mt-5 flex justify-center gap-8 text-center">
          <div>
            <p className="text-xl font-bold text-ink">{test.total_questions}</p>
            <p className="text-xs text-ink-muted">questions</p>
          </div>
          <div>
            <p className="text-xl font-bold text-ink">~{test.estimated_duration_minutes}</p>
            <p className="text-xs text-ink-muted">minutes</p>
          </div>
        </div>
        {test.teacher_name && (
          <p className="mt-4 text-xs text-ink-muted">From {test.teacher_name}</p>
        )}

        <div className="mt-6 space-y-3">
          {isCompleted ? (
            <>
              <Button
                full
                onClick={() => start.mutate('revision')}
                loading={start.isPending && start.variables === 'revision'}
              >
                Revise this test
              </Button>
              <Button
                full
                variant="secondary"
                onClick={() => start.mutate('reattempt')}
                loading={start.isPending && start.variables === 'reattempt'}
              >
                Practice again
              </Button>
              <Link to={`/student/tests/${testId}/results`} className="block">
                <Button full variant="ghost">
                  View my results
                </Button>
              </Link>
              <p className="text-xs leading-relaxed text-ink-muted">
                Revising earns review XP. Practicing again is great too — XP
                for this test is earned once per week.
              </p>
            </>
          ) : isInProgress ? (
            <>
              <Button
                full
                onClick={() => start.mutate('continue')}
                loading={start.isPending && start.variables === 'continue'}
              >
                Resume where I left off
              </Button>
              <Button
                full
                variant="secondary"
                onClick={() => start.mutate('reattempt')}
                loading={start.isPending && start.variables === 'reattempt'}
              >
                Start fresh instead
              </Button>
              <p className="text-xs leading-relaxed text-ink-muted">
                Starting fresh sets aside your earlier attempt and costs 3 XP
                for consistency — resuming keeps everything.
              </p>
            </>
          ) : (
            <>
              <Button
                full
                onClick={() => start.mutate('continue')}
                loading={start.isPending}
              >
                Start test
              </Button>
              <p className="text-xs leading-relaxed text-ink-muted">
                Take your time. Hints are there to teach the approach — and
                trying again after a wrong answer earns XP too.
              </p>
            </>
          )}
        </div>

        {error && (
          <p className="mt-4 text-sm text-band-red" role="alert">
            {error}
          </p>
        )}
      </Card>
    </div>
  )
}
