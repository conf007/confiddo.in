/**
 * /student/sessions/:sid/review — review-before-submit step (mirrors the
 * Flutter pre-completion review).
 *
 * Summary grid of all questions (answered / incorrect / skipped) with
 * jump-back. did_review=true once the student jumps back to revisit any
 * question from here — the backend zeroes the skipped/incorrect penalties
 * when did_review is true (sessions.py:507-513).
 *
 * Finish -> POST /student/sessions/{sid}/complete with the client-observed
 * facts: skipped_count, incorrect_count, did_review, app_switches.
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/icons'
import {
  studentKeys,
  useInvalidateStudentData,
} from '../../components/student/hooks'
import { friendlyError } from '../../lib/api/errors'
import { completeSession } from '../../lib/api/sessions'
import type { GamificationData } from '../../lib/api/student'
import {
  answeredCount,
  incorrectCount,
  incorrectNumbers,
  loadTracked,
  setCompletion,
  setDidReview,
  skippedCount,
  skippedNumbers,
} from './session/tracker'
import { useAppSwitchTracking } from './session/useAppSwitches'

export function ReviewPage() {
  const { sid = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const invalidate = useInvalidateStudentData()
  const [tracked, setTracked] = useState(() => loadTracked(sid))

  useAppSwitchTracking(sid, true)

  const finish = useMutation({
    mutationFn: () => {
      if (!tracked) throw new Error('session missing')
      return completeSession(sid, {
        skipped_count: skippedCount(tracked),
        incorrect_count: incorrectCount(tracked),
        did_review: tracked.didReview,
        app_switches: tracked.appSwitches,
      }, tracked.version)
    },
    onSuccess: (res) => {
      if (tracked) {
        const prev = qc.getQueryData<GamificationData>(studentKeys.gamification)
        setCompletion(tracked, res, prev?.level)
      }
      invalidate()
      void navigate(`/student/sessions/${sid}/done`, { replace: true })
    },
  })

  if (!tracked) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-ink-muted">
          This session isn't open anymore. Head home to pick up where you left off.
        </p>
        <Link to="/student" className="mt-4 inline-block">
          <Button variant="secondary">Back to home</Button>
        </Link>
      </div>
    )
  }

  const answered = answeredCount(tracked)
  const skipped = skippedNumbers(tracked)
  const incorrect = incorrectNumbers(tracked)
  const needsAttention = skipped.length + incorrect.length > 0
  const firstToRevisit = [...skipped, ...incorrect].sort((a, b) => a - b)[0]

  const jumpBack = (questionNumber: number) => {
    setTracked(setDidReview(tracked))
    void navigate(`/student/sessions/${sid}/q/${questionNumber}`)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-ink">Almost there!</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {needsAttention
            ? 'One last look before you finish — reviewing protects your XP, too.'
            : 'Everything answered. Take a breath and finish when ready.'}
        </p>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="py-4 text-center">
          <p className="text-xl font-bold text-ink">{answered}</p>
          <p className="text-xs text-ink-muted">answered</p>
        </Card>
        <Card className="py-4 text-center">
          <p className="text-xl font-bold text-ink">{incorrect.length}</p>
          <p className="text-xs text-ink-muted">to rethink</p>
        </Card>
        <Card className="py-4 text-center">
          <p className="text-xl font-bold text-ink">{skipped.length}</p>
          <p className="text-xs text-ink-muted">skipped</p>
        </Card>
      </div>

      {/* Question grid with jump-back */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink">Tap a question to revisit it</h2>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {Array.from({ length: tracked.totalQuestions }, (_, i) => i + 1).map((qn) => {
            const state = tracked.questions[qn]
            const status = !state?.answered
              ? 'skipped'
              : state.isCorrect
                ? 'correct'
                : 'incorrect'
            return (
              <button
                key={qn}
                type="button"
                onClick={() => jumpBack(qn)}
                aria-label={`Question ${qn}: ${status}`}
                className={[
                  'flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                  status === 'correct'
                    ? 'bg-success-tint text-success'
                    : status === 'incorrect'
                      ? 'bg-accent-tint text-accent'
                      : 'bg-slate-100 text-ink-muted',
                ].join(' ')}
              >
                {qn}
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-success-tint ring-1 ring-success/40" /> correct
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-accent-tint ring-1 ring-accent/40" /> to rethink
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-100 ring-1 ring-slate-300" /> skipped
          </span>
        </div>
      </Card>

      {tracked.appSwitches > 0 && (
        <p className="text-center text-xs text-ink-muted">
          You stepped away {tracked.appSwitches} time{tracked.appSwitches === 1 ? '' : 's'} during
          this test — staying focused earns a little more XP next time.
        </p>
      )}

      {finish.isError && (
        <p className="text-center text-sm text-band-red" role="alert">
          {friendlyError(finish.error)}
        </p>
      )}

      <div className="space-y-3">
        {needsAttention && firstToRevisit !== undefined && (
          <Button full onClick={() => jumpBack(firstToRevisit)}>
            Review them first
            <Badge tone="neutral" className="bg-white/20 text-white">
              protects your XP
            </Badge>
          </Button>
        )}
        <Button
          full
          variant={needsAttention ? 'secondary' : 'primary'}
          onClick={() => finish.mutate()}
          loading={finish.isPending}
        >
          <Icon name="check" className="h-4.5 w-4.5" />
          {needsAttention ? 'Finish anyway' : 'Finish test'}
        </Button>
      </div>
    </div>
  )
}
