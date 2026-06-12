/**
 * Client-side session tracker — the web counterpart of the Flutter question
 * screen's in-memory state. Persists to sessionStorage so a reload mid-test
 * doesn't lose client-observable facts the backend can't reconstruct:
 *
 *   - app_switches  : absences > 30 s counted via visibilitychange
 *   - skipped/answered per question (for skipped_count / incorrect_count)
 *   - did_review    : whether the review step was visited before finishing
 *
 * These feed POST /student/sessions/{sid}/complete
 * (backend/app/schemas/session.py CompleteSessionRequest :107-112):
 *   skipped_count   = total_questions - answered questions
 *   incorrect_count = answered questions whose FINAL submission was wrong
 *   did_review      = review step reached (server zeroes both penalties when true)
 *   app_switches    = tracked count (server: first -2, each additional -3)
 *
 * Everything else (option_changes, hints_used, persistence flags, XP) is
 * tracked server-side by the 8-call lifecycle — never duplicated here.
 */
import type { CompleteSessionResponse } from '../../../lib/api/sessions'

export interface TrackedQuestion {
  questionId: string
  number: number
  /** Final submission state */
  answered: boolean
  isCorrect?: boolean
  selectedOptionId?: string
  selectedOptionLabel?: string
  correctOptionId?: string
  /** At least one wrong submission happened (persistence prompt shown once) */
  wrongOnce: boolean
  /** 'persisted' = chose Try Again, 'gave_up' = chose See Solution */
  persistenceChoice?: 'persisted' | 'gave_up'
  hintViewed: boolean
  solutionViewed: boolean
  /** Number of POST .../submit calls made for this question */
  submissions: number
}

export interface TrackedSession {
  sessionId: string
  testId: string
  testTitle?: string
  subject?: string
  totalQuestions: number
  isRevision: boolean
  isLate: boolean
  lateMessage?: string
  /** Absences > 30 s (visibilitychange); reported at complete */
  appSwitches: number
  /** epoch ms when the tab went hidden; cleared on return */
  hiddenAt?: number
  /** Review step visited before finishing */
  didReview: boolean
  questions: Record<number, TrackedQuestion>
  /** Saved complete() response so /done survives a reload */
  completion?: CompleteSessionResponse
  completedAt?: number
  /** XP level before completing — lets /done celebrate a level-up */
  prevLevel?: number
}

const key = (sessionId: string) => `confiddo.session.${sessionId}`

export function loadTracked(sessionId: string): TrackedSession | null {
  try {
    const raw = sessionStorage.getItem(key(sessionId))
    return raw ? (JSON.parse(raw) as TrackedSession) : null
  } catch {
    return null
  }
}

export function saveTracked(session: TrackedSession): void {
  try {
    sessionStorage.setItem(key(session.sessionId), JSON.stringify(session))
  } catch {
    /* storage full/unavailable — tracking degrades gracefully */
  }
}

export function initTracked(args: {
  sessionId: string
  testId: string
  totalQuestions: number
  isRevision: boolean
  isLate: boolean
  lateMessage?: string
  testTitle?: string
  subject?: string
}): TrackedSession {
  // Resuming (mode=continue): keep accumulated counts from this browser session
  const existing = loadTracked(args.sessionId)
  if (existing && !existing.completion) {
    const merged = { ...existing, ...args, questions: existing.questions }
    saveTracked(merged)
    return merged
  }
  const fresh: TrackedSession = {
    ...args,
    appSwitches: 0,
    didReview: false,
    questions: {},
  }
  saveTracked(fresh)
  return fresh
}

export function getQuestionState(
  session: TrackedSession,
  number: number,
): TrackedQuestion | undefined {
  return session.questions[number]
}

export function upsertQuestion(
  session: TrackedSession,
  number: number,
  patch: Partial<TrackedQuestion> & { questionId: string },
): TrackedSession {
  const prev: TrackedQuestion = session.questions[number] ?? {
    questionId: patch.questionId,
    number,
    answered: false,
    wrongOnce: false,
    hintViewed: false,
    solutionViewed: false,
    submissions: 0,
  }
  const next = {
    ...session,
    questions: { ...session.questions, [number]: { ...prev, ...patch } },
  }
  saveTracked(next)
  return next
}

export function setDidReview(session: TrackedSession): TrackedSession {
  const next = { ...session, didReview: true }
  saveTracked(next)
  return next
}

export function setCompletion(
  session: TrackedSession,
  completion: CompleteSessionResponse,
  prevLevel?: number,
): TrackedSession {
  const next = { ...session, completion, completedAt: Date.now(), prevLevel }
  saveTracked(next)
  return next
}

// ── Derived counts for the complete() payload ─────────────────────────

export function answeredCount(session: TrackedSession): number {
  return Object.values(session.questions).filter((q) => q.answered).length
}

export function skippedCount(session: TrackedSession): number {
  return Math.max(0, session.totalQuestions - answeredCount(session))
}

export function incorrectCount(session: TrackedSession): number {
  return Object.values(session.questions).filter(
    (q) => q.answered && q.isCorrect === false,
  ).length
}

/** Question numbers viewed-or-not but never answered (for the review grid). */
export function skippedNumbers(session: TrackedSession): number[] {
  const numbers: number[] = []
  for (let n = 1; n <= session.totalQuestions; n++) {
    if (!session.questions[n]?.answered) numbers.push(n)
  }
  return numbers
}

export function incorrectNumbers(session: TrackedSession): number[] {
  return Object.values(session.questions)
    .filter((q) => q.answered && q.isCorrect === false)
    .map((q) => q.number)
    .sort((a, b) => a - b)
}
