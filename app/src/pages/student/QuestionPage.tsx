/**
 * /student/sessions/:sid/q/:n — the question screen (parity-critical core,
 * ARCHITECTURE.md §5.1 calls 2-6).
 *
 * State machine per question:
 *   answering -> submit -> correct  -> feedback (+ optional curiosity
 *                                      solution, after_correct=true, +1 XP)
 *                       -> wrong #1 -> persistence prompt:
 *                            "Try Again"    -> POST persistence?persisted=true
 *                                              then back to answering — the
 *                                              REAL resubmit makes it stick
 *                                              (server anti-spoof needs >= 2
 *                                              submissions, sessions.py:398)
 *                            "See Solution" -> POST persistence?persisted=false
 *                                              then GET solution
 *                       -> wrong again -> retry or solution (choice already
 *                                         recorded; resubmits keep counting
 *                                         option_changes server-side)
 *
 * Client-observable facts only: per-question timer (time_spent_ms, clamped to
 * the server's 200 ms/600 s awareness bounds), app switches > 30 s
 * (useAppSwitchTracking), skip tracking (viewed-never-submitted). Everything
 * else — option_changes, hints_used, XP — is tracked server-side.
 *
 * Desktop: centered question card (max-w-[720px]) + slim progress rail.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/icons'
import { Spinner } from '../../components/ui/Spinner'
import { Sheet } from '../../components/student/Sheet'
import { friendlyError } from '../../lib/api/errors'
import {
  getHint,
  getSessionBundle,
  markQuestionsViewed,
  versionConflictOf,
  getSolution,
  recordPersistence,
  reportQuestion,
  submitAnswer,
  type SubmitAnswerResponse,
} from '../../lib/api/sessions'
import {
  getQuestionState,
  loadTracked,
  setVersion,
  upsertQuestion,
  type TrackedSession,
} from './session/tracker'
import { useAppSwitchTracking } from './session/useAppSwitches'

type Phase =
  | 'answering'
  | 'correct'
  | 'wrong-first' // persistence prompt
  | 'wrong-again'
  | 'solution'

const CORRECT_COPY = [
  'Nice one! You nailed it.',
  'Exactly right — great thinking!',
  "That's it! Well done.",
  'Correct! Your practice is showing.',
]
const WRONG_COPY = [
  "Not this time — and that's completely okay.",
  'Close! Wrong answers are how learning happens.',
  "Not quite — but you're thinking, and that's what counts.",
]

export function QuestionPage() {
  const { sid = '', n = '1' } = useParams()
  const number = Math.max(1, parseInt(n, 10) || 1)
  // Keyed remount: all per-question state (phase, selection, hint, timer)
  // initializes fresh whenever the question — or session — changes.
  return <QuestionInner key={`${sid}:${number}`} sid={sid} number={number} />
}

function QuestionInner({ sid, number }: { sid: string; number: number }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Tracked session (sessionStorage). Deep-link without one degrades politely.
  const [tracked, setTracked] = useState<TrackedSession | null>(() => loadTracked(sid))

  const [phase, setPhase] = useState<Phase>('answering')
  const [selected, setSelected] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<SubmitAnswerResponse | null>(null)
  const [hintOpen, setHintOpen] = useState(false)
  const [hintText, setHintText] = useState<string | null>(null)
  const [solutionText, setSolutionText] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [feedbackLine, setFeedbackLine] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  // Per-question timer — this component remounts per question (key above),
  // so a mount-time effect stamps the start. tryAgain re-stamps on retry.
  const startedAtRef = useRef<number | null>(null)
  useEffect(() => {
    startedAtRef.current ??= Date.now()
  }, [])

  useAppSwitchTracking(sid, true)

  // WS-E: one bundle fetch per session instead of one GET per question; the server creates
  // the attempt row when we report the question as viewed (markQuestionsViewed below).
  const bundleQuery = useQuery({
    queryKey: ['student', 'session', sid, 'bundle'],
    queryFn: () => getSessionBundle(sid),
    staleTime: Infinity,
  })
  const questionQuery = {
    data: bundleQuery.data
      ? {
          question: bundleQuery.data.questions.find((q) => q.question_number === number),
          progress: { current: number, total: bundleQuery.data.session.total_questions },
        }
      : undefined,
    isLoading: bundleQuery.isLoading,
    isError: bundleQuery.isError,
    error: bundleQuery.error,
  }
  useEffect(() => {
    if (!bundleQuery.data) return
    const v = bundleQuery.data.session.version ?? undefined
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot sync of the server version into the tracker
    setTracked((prev) => (prev ? setVersion(prev, v) : prev))
    void markQuestionsViewed(sid, [number]).catch(() => {
      /* best-effort: the submit path creates the row anyway */
    })
  }, [bundleQuery.data, sid, number])

  const question = questionQuery.data?.question
  const total = questionQuery.data?.progress.total ?? tracked?.totalQuestions ?? 10
  const isLast = number >= total
  const qState = tracked ? getQuestionState(tracked, number) : undefined

  // Record "viewed" in the tracker once the question arrives (the server
  // creates the QuestionAttempt row on this same GET). One-shot sync of
  // async query data into the tracker; the equality guard prevents loops.
  useEffect(() => {
    if (!question) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- guarded one-shot sync of server data into the session tracker
    setTracked((prev) => {
      const base = prev ?? loadTracked(sid)
      if (!base) return prev
      if (base.questions[number]) return base
      return upsertQuestion(base, number, { questionId: question.id })
    })
  }, [question, number, sid])

  const updateQuestion = useCallback(
    (patch: Partial<NonNullable<typeof qState>> & { questionId: string }) => {
      setTracked((prev) => (prev ? upsertQuestion(prev, number, patch) : prev))
    },
    [number],
  )

  // ── Mutations ───────────────────────────────────────────────────────

  // WS-F: when the server says the session moved on another device (409 VERSION_CONFLICT),
  // re-hydrate from the bundle and jump to where it is now instead of racing.
  const resync = useCallback(
    (current: { version: number; status: string; current_question_number: number }) => {
      setTracked((prev) => (prev ? setVersion(prev, current.version) : prev))
      void queryClient.invalidateQueries({ queryKey: ['student', 'session', sid, 'bundle'] })
      if (current.status !== 'in_progress') {
        setActionError('This test was finished on another device.')
        void navigate(`/student`)
        return
      }
      setActionError('This test moved ahead on another device — continuing from there.')
      void navigate(`/student/sessions/${sid}/q/${current.current_question_number}`)
    },
    [navigate, queryClient, sid],
  )

  const submit = useMutation({
    mutationFn: () => {
      if (!question || !selected) throw new Error('no selection')
      const startedAt = startedAtRef.current ?? Date.now()
      return submitAnswer(sid, question.id, selected, Date.now() - startedAt, tracked?.version)
    },
    onSuccess: (res) => {
      if (!question) return
      setActionError(null)
      setLastResult(res)
      setTracked((prev) => (prev ? setVersion(prev, res.version) : prev))
      const wasWrongBefore = qState?.wrongOnce ?? false
      updateQuestion({
        questionId: question.id,
        answered: true,
        isCorrect: res.is_correct,
        selectedOptionId: selected ?? undefined,
        selectedOptionLabel: question.options.find((o) => o.id === selected)?.label,
        correctOptionId: res.correct_option_id,
        wrongOnce: wasWrongBefore || !res.is_correct,
        submissions: (qState?.submissions ?? 0) + 1,
      })
      if (res.is_correct) {
        setFeedbackLine(CORRECT_COPY[Math.floor(Math.random() * CORRECT_COPY.length)])
        setPhase('correct')
      } else {
        setFeedbackLine(WRONG_COPY[Math.floor(Math.random() * WRONG_COPY.length)])
        setPhase(wasWrongBefore ? 'wrong-again' : 'wrong-first')
      }
    },
    onError: (e) => {
      const conflict = versionConflictOf(e)
      if (conflict) resync(conflict)
      else setActionError(friendlyError(e))
    },
  })

  const hint = useMutation({
    mutationFn: () => {
      if (!question) throw new Error('no question')
      return getHint(sid, question.id)
    },
    onSuccess: (res) => {
      setHintText(res.hint)
      setHintOpen(true)
      if (question) updateQuestion({ questionId: question.id, hintViewed: true })
    },
    onError: (e) => setActionError(friendlyError(e)),
  })

  const persistence = useMutation({
    mutationFn: (persisted: boolean) => {
      if (!question) throw new Error('no question')
      return recordPersistence(sid, question.id, persisted, tracked?.version)
    },
    onSuccess: (res) => setTracked((prev) => (prev ? setVersion(prev, res.version) : prev)),
    onError: (e) => {
      const conflict = versionConflictOf(e)
      if (conflict) resync(conflict)
    },
  })

  const solution = useMutation({
    mutationFn: (afterCorrect: boolean) => {
      if (!question) throw new Error('no question')
      return getSolution(sid, question.id, afterCorrect)
    },
    onSuccess: (res) => {
      setSolutionText(res.solution)
      setPhase('solution')
      if (question) updateQuestion({ questionId: question.id, solutionViewed: true })
    },
    onError: (e) => setActionError(friendlyError(e)),
  })

  // ── Actions ─────────────────────────────────────────────────────────

  const goNext = () => {
    if (isLast) void navigate(`/student/sessions/${sid}/review`)
    else void navigate(`/student/sessions/${sid}/q/${number + 1}`)
  }

  /** "Try Again": record persisted=true, then a real resubmit makes it stick. */
  const tryAgain = () => {
    if (question) {
      updateQuestion({ questionId: question.id, persistenceChoice: 'persisted' })
      persistence.mutate(true)
    }
    startedAtRef.current = Date.now()
    setPhase('answering')
  }

  /** "See Solution" after wrong: persisted=false (gave up), then solution. */
  const seeSolutionAfterWrong = () => {
    if (!question) return
    if (phase === 'wrong-first') {
      updateQuestion({ questionId: question.id, persistenceChoice: 'gave_up' })
      persistence.mutate(false)
    }
    solution.mutate(false)
  }

  /** Curiosity: solution after a CORRECT answer (after_correct=true, +1 XP). */
  const seeSolutionAfterCorrect = () => solution.mutate(true)

  // ── Render ──────────────────────────────────────────────────────────

  if (questionQuery.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  if (!question) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-ink-muted">{friendlyError(questionQuery.error)}</p>
        <Link to="/student" className="mt-4 inline-block">
          <Button variant="secondary">Back to home</Button>
        </Link>
      </div>
    )
  }

  const showFeedback = phase !== 'answering'
  const answeredThisQuestion = phase !== 'answering'

  return (
    <div className="mx-auto flex max-w-5xl gap-8">
      {/* Progress rail — desktop only */}
      <ProgressRail sid={sid} tracked={tracked} total={total} current={number} />

      <div className="mx-auto w-full max-w-[720px] space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/student"
            className="inline-flex h-12 items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink-soft"
            title="Save and exit — you can resume anytime"
          >
            <Icon name="close" className="h-4 w-4" />
            <span className="hidden sm:inline">Save & exit</span>
          </Link>
          <div className="flex items-center gap-2">
            {tracked?.isRevision && <Badge tone="primary">Revision</Badge>}
            {tracked?.isLate && <Badge tone="neutral">Late submission</Badge>}
            <Badge tone="neutral">
              {number} of {total}
            </Badge>
          </div>
        </div>

        {/* Mobile progress bar */}
        <div className="lg:hidden">
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${(number / total) * 100}%` }}
            />
          </div>
        </div>

        <Card className="space-y-5">
          <p className="text-base leading-relaxed font-medium text-ink sm:text-lg">
            {question.question_text}
          </p>

          {/* Options A-D */}
          <div className="space-y-3" role="radiogroup" aria-label="Answer options">
            {question.options.map((option) => {
              const isSelected = selected === option.id
              const isCorrectOption =
                showFeedback && lastResult?.correct_option_id === option.id
              const isWrongPick =
                showFeedback && isSelected && lastResult ? !lastResult.is_correct : false
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={answeredThisQuestion}
                  onClick={() => setSelected(option.id)}
                  className={[
                    'flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors duration-150',
                    'min-h-12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                    'disabled:cursor-default',
                    isCorrectOption
                      ? 'border-success bg-success-tint'
                      : isWrongPick
                        ? 'border-slate-300 bg-slate-50'
                        : isSelected
                          ? 'border-primary bg-primary-tint'
                          : 'border-slate-200 bg-card hover:border-primary/40',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                      isCorrectOption
                        ? 'bg-success text-white'
                        : isSelected
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 text-ink-soft',
                    ].join(' ')}
                  >
                    {option.label}
                  </span>
                  <span className="pt-1 text-sm leading-relaxed text-ink">{option.text}</span>
                  {isCorrectOption && (
                    <Icon name="check" className="mt-1.5 ml-auto h-5 w-5 shrink-0 text-success" />
                  )}
                </button>
              )
            })}
          </div>

          {actionError && (
            <p className="text-sm text-band-red" role="alert">
              {actionError}
            </p>
          )}

          {/* ── Footer actions per phase ── */}
          {phase === 'answering' && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                onClick={() => submit.mutate()}
                disabled={!selected}
                loading={submit.isPending}
                className="sm:flex-1"
              >
                Check answer
              </Button>
              <Button
                variant="secondary"
                onClick={() => (hintText ? setHintOpen(true) : hint.mutate())}
                loading={hint.isPending}
              >
                <Icon name="sparkles" className="h-4.5 w-4.5" />
                {qState?.hintViewed || hintText ? 'View hint again' : 'Need a hint?'}
              </Button>
              <button
                type="button"
                onClick={goNext}
                className="inline-flex h-12 items-center justify-center px-3 text-sm font-medium text-ink-muted hover:text-ink-soft"
              >
                Skip for now
              </button>
            </div>
          )}

          {phase === 'correct' && (
            <FeedbackBlock tone="correct" line={feedbackLine}>
              <Button onClick={goNext} className="sm:flex-1">
                {isLast ? 'Review my answers' : 'Next question'}
              </Button>
              <Button
                variant="secondary"
                onClick={seeSolutionAfterCorrect}
                loading={solution.isPending}
              >
                See why it works (+1 XP)
              </Button>
            </FeedbackBlock>
          )}

          {phase === 'wrong-first' && (
            <FeedbackBlock
              tone="wrong"
              line={feedbackLine}
              sub="What would you like to do? Trying again earns more XP than peeking."
            >
              <Button onClick={tryAgain} className="sm:flex-1">
                Try again (+2 XP)
              </Button>
              <Button
                variant="secondary"
                onClick={seeSolutionAfterWrong}
                loading={solution.isPending}
              >
                See solution
              </Button>
            </FeedbackBlock>
          )}

          {phase === 'wrong-again' && (
            <FeedbackBlock
              tone="wrong"
              line="Still tricky — that happens to everyone."
              sub="You've already earned persistence XP for trying again."
            >
              <Button onClick={tryAgain} className="sm:flex-1">
                One more try
              </Button>
              <Button
                variant="secondary"
                onClick={seeSolutionAfterWrong}
                loading={solution.isPending}
              >
                See solution
              </Button>
              <Button variant="ghost" onClick={goNext}>
                {isLast ? 'Review answers' : 'Next'}
              </Button>
            </FeedbackBlock>
          )}

          {phase === 'solution' && solutionText && (
            <div className="space-y-4 rounded-2xl bg-primary-tint/60 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Icon name="book" className="h-4.5 w-4.5" />
                Solution
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-line text-ink-soft">
                {solutionText}
              </p>
              {lastResult && !lastResult.is_correct && (
                <p className="text-xs text-ink-muted">
                  The correct answer was option {lastResult.correct_option_label}.
                </p>
              )}
              <Button onClick={goNext} full>
                {isLast ? 'Review my answers' : 'Next question'}
              </Button>
            </div>
          )}
        </Card>

        {/* Report a problem */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="inline-flex h-12 items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink-soft"
          >
            <Icon name="alert" className="h-3.5 w-3.5" />
            Something wrong with this question?
          </button>
        </div>
      </div>

      {/* Hint sheet — hints teach approach, never answers */}
      <Sheet open={hintOpen} onClose={() => setHintOpen(false)} title="Here's a nudge">
        <div className="space-y-3 pb-2">
          <p className="text-sm leading-relaxed whitespace-pre-line text-ink-soft">{hintText}</p>
          <p className="text-xs text-ink-muted">
            Hints teach the approach, never the answer — using one still earns
            you XP for a correct answer.
          </p>
          <Button full variant="secondary" onClick={() => setHintOpen(false)}>
            Got it, let me try
          </Button>
        </div>
      </Sheet>

      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        questionId={question.id}
      />
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────

function FeedbackBlock({
  tone,
  line,
  sub,
  children,
}: {
  tone: 'correct' | 'wrong'
  line: string
  sub?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={[
        'space-y-3 rounded-2xl p-4 animate-[feedback-in_240ms_ease-out]',
        tone === 'correct' ? 'bg-success-tint' : 'bg-slate-50',
      ].join(' ')}
    >
      <p
        className={`text-sm font-semibold ${tone === 'correct' ? 'text-success' : 'text-ink'}`}
      >
        {line}
      </p>
      {sub && <p className="text-xs leading-relaxed text-ink-muted">{sub}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">{children}</div>
      <style>{`@keyframes feedback-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }`}</style>
    </div>
  )
}

function ProgressRail({
  sid,
  tracked,
  total,
  current,
}: {
  sid: string
  tracked: TrackedSession | null
  total: number
  current: number
}) {
  const navigate = useNavigate()
  return (
    <nav
      aria-label="Question progress"
      className="sticky top-24 hidden h-fit w-14 shrink-0 flex-col items-center gap-2 lg:flex"
    >
      {Array.from({ length: total }, (_, i) => i + 1).map((qn) => {
        const state = tracked?.questions[qn]
        const isCurrent = qn === current
        return (
          <button
            key={qn}
            type="button"
            aria-label={`Question ${qn}${state?.answered ? ' (answered)' : ''}`}
            aria-current={isCurrent ? 'step' : undefined}
            onClick={() => void navigate(`/student/sessions/${sid}/q/${qn}`)}
            className={[
              'flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              isCurrent
                ? 'bg-primary text-white ring-4 ring-primary/15'
                : state?.answered
                  ? 'bg-primary-tint text-primary'
                  : 'bg-slate-100 text-ink-muted hover:bg-slate-200',
            ].join(' ')}
          >
            {qn}
          </button>
        )
      })}
    </nav>
  )
}

function ReportSheet({
  open,
  onClose,
  questionId,
}: {
  open: boolean
  onClose: () => void
  questionId: string
}) {
  const [type, setType] = useState('wrong_answer')
  const report = useMutation({
    mutationFn: () => reportQuestion(questionId, type),
  })

  const close = () => {
    report.reset()
    setType('wrong_answer')
    onClose()
  }

  const options = [
    { value: 'wrong_answer', label: 'The marked answer looks wrong' },
    { value: 'unclear_question', label: 'The question is confusing' },
    { value: 'typo', label: 'There is a typo or formatting issue' },
  ]

  return (
    <Sheet open={open} onClose={close} title="Report this question">
      {report.isSuccess ? (
        <div className="space-y-4 pb-2 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-tint text-success">
            <Icon name="check" className="h-6 w-6" />
          </span>
          <p className="text-sm text-ink-soft">
            Thanks for flagging it — your teacher will take a look.
          </p>
          <Button full variant="secondary" onClick={close}>
            Back to the test
          </Button>
        </div>
      ) : (
        <div className="space-y-4 pb-2">
          <div className="space-y-2" role="radiogroup" aria-label="Report reason">
            {options.map((o) => (
              <label
                key={o.value}
                className={[
                  'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm',
                  type === o.value
                    ? 'border-primary bg-primary-tint text-ink'
                    : 'border-slate-200 text-ink-soft',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="report-type"
                  value={o.value}
                  checked={type === o.value}
                  onChange={() => setType(o.value)}
                  className="sr-only"
                />
                {o.label}
              </label>
            ))}
          </div>
          <Button full onClick={() => report.mutate()} loading={report.isPending}>
            Send report
          </Button>
        </div>
      )}
    </Sheet>
  )
}
