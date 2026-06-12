/**
 * /teacher/classes/:classId/review[?test=] — readiness validation queue
 * (Flutter parity: student_review_screen.dart, bulk_validation_screen.dart,
 * review_complete_screen.dart, metric_explainability_screen.dart).
 *
 * Endpoints:
 *   POST /teacher/classes/{id}/reviews/start?test_id=  (teacher.py:130-158)
 *   GET  /teacher/classes/{id}/suggestions?test_id=    (teacher.py:106-127)
 *   POST /teacher/suggestions/{id}/validate            (teacher.py:161-211)
 *   POST /teacher/classes/{id}/bulk-validate           (teacher.py:582-596)
 *   GET  /teacher/suggestions/{id}/explanation         (teacher.py:280-291)
 *   POST /teacher/reviews/{session_id}/complete        (teacher.py:214-255)
 *
 * Privacy: readiness is shown as WORDS (avoidant → "Needs Encouragement",
 * parity lib display names). The composite readiness_score returned by the
 * API is intentionally not rendered — the Flutter review screen leads with
 * level words + observed patterns, and the web mirrors that.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { LevelPicker } from '../../components/teacher/LevelPicker'
import { ReadinessChip } from '../../components/teacher/ReadinessChip'
import { metricFriendlyName } from '../../components/teacher/metricNames'
import { teacherKeys } from '../../components/teacher/hooks'
import {
  bulkValidateSuggestions,
  completeReviewSession,
  getClassSuggestions,
  getSuggestionExplanation,
  startReviewSession,
  validateSuggestion,
  type CompleteReviewResult,
  type StudentSuggestion,
} from '../../lib/api/teacher'
import { friendlyError } from '../../lib/api/errors'
import type { ReadinessCode } from '../../lib/parity'

function Explanation({ suggestionId }: { suggestionId: string }) {
  const explanation = useQuery({
    queryKey: teacherKeys.explanation(suggestionId),
    queryFn: () => getSuggestionExplanation(suggestionId),
  })
  if (explanation.isLoading) {
    return <p className="mt-3 text-xs text-ink-muted">Loading explanation…</p>
  }
  const e = explanation.data
  if (!e) {
    return (
      <p className="mt-3 text-xs text-ink-muted">
        {friendlyError(explanation.error, 'No explanation available for this suggestion.')}
      </p>
    )
  }
  return (
    <div className="mt-3 rounded-xl bg-surface p-4">
      <p className="text-xs leading-relaxed text-ink-soft">{e.ai_summary}</p>
      {e.metrics.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {e.metrics.map((m) => (
            <li key={m.code} className="flex items-center gap-2 text-xs">
              <span
                className={[
                  'inline-block h-1.5 w-1.5 shrink-0 rounded-full',
                  m.direction === 'up'
                    ? 'bg-band-green'
                    : m.direction === 'down'
                      ? 'bg-band-red'
                      : 'bg-slate-300',
                ].join(' ')}
                aria-hidden
              />
              <span className="font-medium text-ink">{metricFriendlyName(m.code)}</span>
              <span className="text-ink-muted">
                {m.direction === 'stable'
                  ? 'steady vs last week'
                  : `${m.direction === 'up' ? '+' : ''}${m.change_pct}% vs last week`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SuggestionRow({
  suggestion,
  onValidate,
  busy,
}: {
  suggestion: StudentSuggestion
  onValidate: (action: 'agree' | 'adjust', level?: ReadinessCode) => void
  busy: boolean
}) {
  const [adjusting, setAdjusting] = useState(false)
  const [picked, setPicked] = useState<ReadinessCode | null>(null)
  const [showWhy, setShowWhy] = useState(false)
  const validated = suggestion.validation_status === 'validated'

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">
            {suggestion.student_first_name}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
            {suggestion.previous_level_display && (
              <>
                <span>Last week:</span>
                <ReadinessChip
                  level={suggestion.previous_level ?? ''}
                  display={suggestion.previous_level_display}
                />
                <span aria-hidden>→</span>
              </>
            )}
            <span>Suggested:</span>
            <ReadinessChip
              level={suggestion.suggested_level}
              display={suggestion.suggested_level_display}
            />
            {suggestion.has_change && !validated && (
              <Badge tone="accent">Change suggested</Badge>
            )}
          </p>
        </div>
        {validated ? (
          <Badge tone="success">
            <Icon name="check" className="h-3 w-3" />
            {suggestion.final_level_display ?? suggestion.suggested_level_display}
            {suggestion.validation_action === 'adjust' && ' (adjusted)'}
          </Badge>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onValidate('agree')}
              loading={busy && !adjusting}
              disabled={busy}
            >
              Agree
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setAdjusting((v) => !v)}
              disabled={busy}
            >
              Adjust
            </Button>
          </div>
        )}
      </div>

      {suggestion.observed_patterns.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {suggestion.observed_patterns.map((p, i) => (
            <li key={i}>
              <Badge tone="outline">{p}</Badge>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setShowWhy((v) => !v)}
        className="mt-3 inline-flex min-h-8 items-center gap-1 text-xs font-medium text-primary hover:text-primary-light"
      >
        <Icon name="chevron-down" className={`h-3.5 w-3.5 transition-transform ${showWhy ? 'rotate-180' : ''}`} />
        {showWhy ? 'Hide the why' : 'Why this suggestion?'}
      </button>
      {showWhy && <Explanation suggestionId={suggestion.suggestion_id} />}

      {adjusting && !validated && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <LevelPicker
            value={picked}
            onChange={setPicked}
            name={`level-${suggestion.suggestion_id}`}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!picked || busy}
              loading={busy && adjusting}
              onClick={() => picked && onValidate('adjust', picked)}
            >
              Confirm level
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdjusting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

export function ReviewQueuePage() {
  const { classId = '' } = useParams()
  const [params] = useSearchParams()
  const testId = params.get('test') ?? undefined
  const queryClient = useQueryClient()
  const [completed, setCompleted] = useState<CompleteReviewResult | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  // Per-decision timing for time_spent_ms (validate query param, teacher.py:165).
  // Initialized in an effect (Date.now is impure during render).
  const lastActionAt = useRef<number | null>(null)
  useEffect(() => {
    lastActionAt.current ??= Date.now()
  }, [])

  // Idempotent: creates or resumes the per-test review session (:130-158)
  const session = useQuery({
    queryKey: ['teacher', 'review-session', classId, testId ?? 'all'],
    queryFn: () => startReviewSession(classId, testId),
    enabled: !!classId,
    staleTime: Infinity,
  })
  const suggestions = useQuery({
    queryKey: teacherKeys.suggestions(classId, testId),
    queryFn: () => getClassSuggestions(classId, testId),
    enabled: !!classId,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: teacherKeys.suggestions(classId, testId) })
    queryClient.invalidateQueries({ queryKey: teacherKeys.classOverview(classId) })
    queryClient.invalidateQueries({ queryKey: teacherKeys.dashboard })
  }

  const validate = useMutation({
    mutationFn: ({
      suggestionId,
      action,
      level,
    }: {
      suggestionId: string
      action: 'agree' | 'adjust'
      level?: ReadinessCode
    }) => {
      const now = Date.now()
      const elapsed =
        lastActionAt.current === null
          ? undefined
          : Math.min(now - lastActionAt.current, 10 * 60_000)
      lastActionAt.current = now
      return validateSuggestion(suggestionId, action, level, elapsed)
    },
    onSettled: () => setBusyId(null),
    onSuccess: invalidate,
  })

  const bulk = useMutation({
    mutationFn: (ids: string[]) => bulkValidateSuggestions(classId, ids, 'agree'),
    onSuccess: invalidate,
  })

  const complete = useMutation({
    mutationFn: () => completeReviewSession(session.data!.session_id!),
    onSuccess: (data) => {
      setCompleted(data)
      invalidate()
    },
  })

  if (session.isLoading || suggestions.isLoading) return <LoadingState />

  if (session.data?.status === 'claimed_by_other') {
    return (
      <EmptyState
        icon="users"
        title="A colleague is already reviewing this"
        description={`${session.data.claimed_by_name ?? 'Another teacher'} claimed this review for the week — one review per test keeps decisions consistent.`}
        action={
          <Link to={`/teacher/classes/${classId}`}>
            <Button variant="secondary">Back to class</Button>
          </Link>
        }
      />
    )
  }

  if (!suggestions.data) {
    return (
      <ErrorState
        title="We couldn't load the review queue"
        error={suggestions.error}
        onRetry={() => suggestions.refetch()}
        icon="check"
      />
    )
  }

  // ── Review complete state ───────────────────────────────────────────
  if (completed) {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-tint text-success">
          <Icon name="check" className="h-8 w-8" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-ink">Review complete</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            You reviewed {completed.students_reviewed} of {completed.total_students}{' '}
            students{completed.total_time_display && ` in ${completed.total_time_display}`}.
            Parents will be notified that results are ready.
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <Link to={`/teacher/classes/${classId}`}>
            <Button>Back to class</Button>
          </Link>
          <Link to="/teacher/analytics">
            <Button variant="secondary">See analytics</Button>
          </Link>
        </div>
      </div>
    )
  }

  const all = suggestions.data.suggestions
  const pending = all.filter((s) => s.validation_status === 'pending')
  const done = all.length - pending.length

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          to={`/teacher/classes/${classId}`}
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink"
        >
          <Icon name="arrow-left" className="h-3.5 w-3.5" />
          Class overview
        </Link>
        <h1 className="text-2xl font-bold text-ink">Weekly readiness review</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {suggestions.data.test_title
            ? `For “${suggestions.data.test_title}” — `
            : ''}
          confirm or adjust each student's suggested readiness level. Your
          judgment is the final word.
        </p>
      </div>

      {all.length === 0 ? (
        <EmptyState
          icon="check"
          title="Nothing to review yet"
          description="Suggestions appear here once students complete the test."
        />
      ) : (
        <>
          {/* Progress + bulk action */}
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">
              <span className="font-semibold text-ink">{done}</span> of{' '}
              {all.length} reviewed
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {pending.length > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={bulk.isPending}
                  onClick={() => bulk.mutate(pending.map((s) => s.suggestion_id))}
                >
                  Agree with all remaining ({pending.length})
                </Button>
              )}
              {pending.length === 0 && session.data?.session_id && (
                <Button
                  size="sm"
                  loading={complete.isPending}
                  onClick={() => complete.mutate()}
                >
                  <Icon name="check" className="h-4 w-4" />
                  Confirm review
                </Button>
              )}
            </div>
          </Card>
          {(validate.error || bulk.error || complete.error) && (
            <p className="text-sm text-band-red">
              {friendlyError(validate.error ?? bulk.error ?? complete.error)}
            </p>
          )}

          <div className="space-y-4">
            {all.map((s) => (
              <SuggestionRow
                key={s.suggestion_id}
                suggestion={s}
                busy={busyId === s.suggestion_id && validate.isPending}
                onValidate={(action, level) => {
                  setBusyId(s.suggestion_id)
                  validate.mutate({ suggestionId: s.suggestion_id, action, level })
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
