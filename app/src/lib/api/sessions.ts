/**
 * The 8-call test attempt lifecycle (ARCHITECTURE.md §5.1) + question report.
 *
 * Shapes mirror the backend exactly:
 *   backend/app/api/sessions.py     (all endpoints)
 *   backend/app/schemas/session.py  (request/response models)
 * All payloads arrive wrapped in { success, data } (see envelope.ts).
 *
 * Parity-critical notes (verified against the code 2026-06-12):
 *  - Question attempts are CREATED ON VIEW (GET .../questions/{n} calls
 *    get_or_create_attempt, sessions.py:205) — a viewed-but-unanswered
 *    question still exists for metrics, and counts as "attempted" for the
 *    XP skip-penalty math.
 *  - "Try Again" anti-spoofing: POST .../persistence?persisted=true only
 *    sticks when the student has >= 2 submissions for that question; a
 *    single-submission claim is recorded as gave_up (sessions.py:398-419).
 *    A later resubmission auto-corrects gave_up -> persisted
 *    (session_service.py:115-118), so the client should send the
 *    persistence choice immediately on the prompt and then let the retry
 *    submission fix the flag.
 *  - Server floors time_spent_ms < 200 and caps > 600000
 *    (session_service.py:121-136). BACKEND SURPRISE: SubmitAnswerRequest
 *    (schemas/session.py:84-85) has no time_spent_ms field and the route
 *    never forwards it (sessions.py:354), so the value is currently dropped
 *    server-side. We send it anyway (Pydantic ignores extras) so the flow is
 *    ready the moment the backend wires it through. TODO-parity.
 *  - complete() awards XP synchronously; metrics run in a background thread
 *    (sessions.py:532-630). did_review=true zeroes skip/incorrect penalties
 *    (sessions.py:507-513).
 */
import { apiData } from './envelope'

// ── 1. Create / resume session (POST /student/sessions) ──────────────

/** schemas/session.py SessionMode :8-11 */
export type SessionMode = 'continue' | 'reattempt' | 'revision'

export interface CreateSessionResponse {
  session_id: string
  test_id: string
  status: string
  /** 1-based; resume lands here in continue mode */
  current_question_number: number
  total_questions: number
  is_revision: boolean
  /** Edge Case #13 — deadline passed; submission allowed but flagged */
  is_late: boolean
  late_message?: string
}

export function createSession(
  testId: string,
  mode: SessionMode = 'continue',
): Promise<CreateSessionResponse> {
  return apiData('/student/sessions', {
    method: 'POST',
    body: { test_id: testId, mode },
  })
}

// ── 2. Get question by number (creates the attempt row on view) ──────

export interface QuestionOption {
  id: string
  label: string // 'A' | 'B' | 'C' | 'D'
  text: string
}

export interface SessionQuestion {
  id: string
  question_number: number
  question_text: string
  options: QuestionOption[]
}

export interface QuestionWithProgress {
  question: SessionQuestion
  progress: { current: number; total: number }
}

export function getQuestion(
  sessionId: string,
  questionNumber: number,
): Promise<QuestionWithProgress> {
  return apiData(`/student/sessions/${sessionId}/questions/${questionNumber}`)
}

// ── 3. Hint (increments hints_used server-side) ──────────────────────

export function getHint(
  sessionId: string,
  questionId: string,
): Promise<{ hint: string }> {
  return apiData(`/student/sessions/${sessionId}/questions/${questionId}/hint`)
}

// ── 4. Submit answer (resubmits increment option_changes server-side) ─

export interface SubmitAnswerResponse {
  recorded: boolean
  is_correct: boolean
  correct_option_id: string
  correct_option_label: string
  has_next: boolean
  next_question_number: number | null
}

export function submitAnswer(
  sessionId: string,
  questionId: string,
  selectedOptionId: string,
  timeSpentMs?: number,
): Promise<SubmitAnswerResponse> {
  return apiData(
    `/student/sessions/${sessionId}/questions/${questionId}/submit`,
    {
      method: 'POST',
      body: {
        selected_option_id: selectedOptionId,
        // Currently ignored by the backend (see header note) — sent for
        // forward-compatibility, clamped to the server's awareness bounds.
        ...(timeSpentMs !== undefined && {
          time_spent_ms: Math.min(600_000, Math.max(200, Math.round(timeSpentMs))),
        }),
      },
    },
  )
}

// ── 5. Persistence choice after FIRST wrong answer ───────────────────

/**
 * persisted=true -> "Try Again" (must be followed by a real resubmit, or the
 * server records gave_up); persisted=false -> "See Solution" (gave up).
 * Boolean travels as a QUERY PARAM (matches api_service.dart:224).
 */
export function recordPersistence(
  sessionId: string,
  questionId: string,
  persisted: boolean,
): Promise<{ recorded: boolean }> {
  return apiData(
    `/student/sessions/${sessionId}/questions/${questionId}/persistence`,
    { method: 'POST', query: { persisted } },
  )
}

// ── 6. Solution (after_correct=true feeds the +1 curiosity XP) ────────

export interface SolutionResponse {
  solution: string
  correct_option_id: string | null
  correct_option_label: string | null
}

export function getSolution(
  sessionId: string,
  questionId: string,
  afterCorrect = false,
): Promise<SolutionResponse> {
  return apiData(
    `/student/sessions/${sessionId}/questions/${questionId}/solution`,
    { query: { after_correct: afterCorrect } },
  )
}

// ── 7. Complete session (awards XP synchronously) ────────────────────

export interface XpBreakdownEntry {
  label: string
  points: number
}

/**
 * gamification_service.award_session_points return value (:119-348).
 * total_earned CAN be negative — only the cumulative total_points is floored
 * at 0 server-side (ARCHITECTURE.md §9.11).
 */
export interface GamificationResult {
  total_earned: number
  breakdown: XpBreakdownEntry[]
  total_points: number
  current_streak: number
  level: number
  level_name: string
  /** Anti-farming: same test already awarded this week (reattempt) */
  is_practice_only?: boolean
  /** Revision sessions only: +3 per question, once per question per week */
  review_points_earned?: number
}

export interface CompleteSessionResponse {
  session_id: string
  status: string
  completed_at: string
  message: string
  gamification: GamificationResult
}

export interface CompleteSessionRequest {
  /** Questions never answered at completion time */
  skipped_count: number
  /** Questions answered incorrectly at completion time */
  incorrect_count: number
  /** true when the student went through the review step — zeroes both penalties */
  did_review: boolean
  /** Client-counted absences > 30 s (visibilitychange) during the session */
  app_switches: number
}

export function completeSession(
  sessionId: string,
  body: CompleteSessionRequest,
): Promise<CompleteSessionResponse> {
  return apiData(`/student/sessions/${sessionId}/complete`, {
    method: 'POST',
    body,
  })
}

// ── 8. Results (student-private review; never shown to parents) ──────

export interface AttemptResult {
  question_number: number
  question_id: string
  question_text: string
  selected_option_id: string | null
  selected_option_label: string | null
  correct_option_id: string
  correct_option_label: string
  is_correct: boolean
  hints_used: number
  solution_viewed: boolean
  solution_viewed_after_correct: boolean
}

/**
 * Golden rule (backend fix A-06, 2026-09): the results payload carries NO aggregate score —
 * correct_count / incorrect_count / score_percentage were removed server-side, and the UI
 * must not reconstruct one from `attempts` either (the student never SEES a score).
 * Per-question correctness stays for the review cards only.
 */
export interface SessionResults {
  session_id: string
  test_id: string
  total_questions: number
  attempts: AttemptResult[]
  incorrect_question_numbers: number[]
}

export function getTestResults(testId: string): Promise<SessionResults> {
  return apiData(`/student/tests/${testId}/results`)
}

// ── Question report (POST /student/questions/{id}/report) ────────────

export function reportQuestion(
  questionId: string,
  reportType = 'wrong_answer',
  description?: string,
): Promise<{ recorded: boolean; message?: string }> {
  return apiData(`/student/questions/${questionId}/report`, {
    method: 'POST',
    query: { report_type: reportType, description },
  })
}
