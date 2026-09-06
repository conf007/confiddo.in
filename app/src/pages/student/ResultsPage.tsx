/**
 * /student/tests/:testId/results — student-private per-question review.
 * GET /student/tests/{test_id}/results (latest completed session, computed
 * server-side at read time). Shown only to the student — parents never see
 * answers or scores (ARCHITECTURE.md §6.3). We show counts in warm words,
 * not percentages.
 *
 * Solution access reuses GET /sessions/{sid}/questions/{qid}/solution with
 * the results' session_id (after_correct mirrors whether the answer was
 * correct, matching the Flutter review flow's recording).
 */
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/icons'
import { Spinner } from '../../components/ui/Spinner'
import { studentKeys } from '../../components/student/hooks'
import { friendlyError } from '../../lib/api/errors'
import {
  correctCount,
  getSolution,
  getTestResults,
  type AttemptResult,
} from '../../lib/api/sessions'

function headline(correct: number, total: number): string {
  if (total === 0) return 'Your review'
  const ratio = correct / total
  if (ratio === 1) return 'Every single one — amazing!'
  if (ratio >= 0.7) return 'Strong work — keep it up!'
  if (ratio >= 0.4) return 'Good effort — every review makes you stronger.'
  return 'Tough one — and reviewing it is exactly the right move.'
}

export function ResultsPage() {
  const { testId = '' } = useParams()
  const results = useQuery({
    queryKey: studentKeys.results(testId),
    queryFn: () => getTestResults(testId),
  })

  if (results.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  const data = results.data
  if (!data) {
    return (
      <EmptyState
        icon="clipboard"
        title="No completed attempt yet"
        description={friendlyError(
          results.error,
          'Finish this test once and your review will live here.',
        )}
        action={
          <Link to={`/student/tests/${testId}/start`}>
            <Button variant="secondary">Go to the test</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          to="/student"
          className="mb-3 inline-flex h-12 items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink-soft"
        >
          <Icon name="arrow-left" className="h-4 w-4" />
          Back to home
        </Link>
        <h1 className="text-2xl font-bold text-ink">
          {headline(correctCount(data), data.total_questions)}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          You got {correctCount(data)} of {data.total_questions} — this review
          is just for you.
        </p>
      </div>

      <div className="space-y-4">
        {data.attempts.map((attempt) => (
          <AttemptCard key={attempt.question_id} attempt={attempt} sessionId={data.session_id} />
        ))}
      </div>

      <div className="pb-4 text-center">
        <Link to={`/student/tests/${testId}/start`}>
          <Button variant="secondary">Practice this test again</Button>
        </Link>
      </div>
    </div>
  )
}

function AttemptCard({
  attempt,
  sessionId,
}: {
  attempt: AttemptResult
  sessionId: string
}) {
  const [solutionText, setSolutionText] = useState<string | null>(null)
  const solution = useMutation({
    mutationFn: () =>
      getSolution(sessionId, attempt.question_id, attempt.is_correct),
    onSuccess: (res) => setSolutionText(res.solution),
  })

  const unanswered = attempt.selected_option_id === null

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-muted">
          Question {attempt.question_number}
        </p>
        <div className="flex gap-1.5">
          {attempt.hints_used > 0 && (
            <Badge tone="primary">
              <Icon name="sparkles" className="h-3 w-3" />
              hint used
            </Badge>
          )}
          {unanswered ? (
            <Badge tone="neutral">skipped</Badge>
          ) : attempt.is_correct ? (
            <Badge tone="success">correct</Badge>
          ) : (
            <Badge tone="accent">worth a rethink</Badge>
          )}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-ink">{attempt.question_text}</p>

      <div className="space-y-1.5 text-sm">
        {!unanswered && (
          <p className={attempt.is_correct ? 'text-success' : 'text-ink-soft'}>
            Your answer: option {attempt.selected_option_label}
            {attempt.is_correct && ' ✓'}
          </p>
        )}
        {!attempt.is_correct && (
          <p className="text-ink-soft">
            Correct answer: option {attempt.correct_option_label}
          </p>
        )}
      </div>

      {solutionText ? (
        <div className="rounded-2xl bg-primary-tint/60 p-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Icon name="book" className="h-3.5 w-3.5" />
            Solution
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-line text-ink-soft">
            {solutionText}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => solution.mutate()}
          disabled={solution.isPending}
          className="inline-flex h-12 items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-light disabled:opacity-50"
        >
          {solution.isPending ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <Icon name="book" className="h-4 w-4" />
          )}
          {attempt.is_correct ? 'See why it works' : 'Walk me through it'}
        </button>
      )}
      {solution.isError && (
        <p className="text-xs text-band-red">{friendlyError(solution.error)}</p>
      )}
    </Card>
  )
}
