/**
 * Teacher-facing endpoints: classes, review/validation workflow, paper
 * creation (question-bank 10-slot model), test status, student detail
 * (trend/notes/flags/interventions), analytics, parent messages and
 * notification preferences.
 *
 * Request/response shapes mirror the backend exactly:
 *   backend/app/api/teacher.py            (router prefix /teacher)
 *   backend/app/schemas/teacher.py        (request models)
 *   backend/app/services/teacher_service.py (response dict shapes)
 * All payloads arrive wrapped in { success, data } (see envelope.ts).
 * Line references below are into backend/app/api/teacher.py unless noted.
 */
import { apiData } from './envelope'

// ── Shared types ──────────────────────────────────────────────────────

/** Readiness level codes (schemas/teacher.py:8-14). */
export type ReadinessCode =
  | 'avoidant'
  | 'attempting'
  | 'practicing'
  | 'confident'
  | 'competition_ready'

export type ValidationAction = 'agree' | 'same' | 'adjust'

export interface LevelDistribution {
  level: ReadinessCode
  level_display: string
  count: number
}

// ── Classes (GET /teacher/classes, teacher.py:40-54) ─────────────────

export interface TeacherClassSummary {
  id: string
  name: string
  grade: string
  subject: string
  student_count: number
  has_pending_review: boolean
  last_reviewed_at: string | null
  reviewed_by_other: boolean
  claimed_by_name: string | null
}

export function getTeacherClasses(): Promise<{ classes: TeacherClassSummary[] }> {
  return apiData('/teacher/classes')
}

// ── Dashboard (GET /teacher/dashboard, teacher.py:71-81) ─────────────
// Shapes: teacher_service.get_teacher_dashboard (:2279-2630).

export interface DashboardTask {
  type:
    | 'incomplete_review'
    | 'draft_test'
    | 'pending_review'
    | 'review_test'
    | 'live_test'
    | 'create_test'
  title: string
  subtitle: string
  action_label: string
  progress_current: number | null
  progress_total: number | null
  /** class_id for review tasks, class_id-or-test_id for test tasks */
  route_param: string
  test_id?: string | null
  test_title?: string | null
  extra_info: string
  timestamp?: string | null
  metadata?: Record<string, string>
}

export interface TeacherDashboard {
  continue_tasks: DashboardTask[]
  pending_tasks: DashboardTask[]
  recent_activities: DashboardTask[]
}

export function getTeacherDashboard(): Promise<TeacherDashboard> {
  return apiData('/teacher/dashboard')
}

// ── My tests (GET /teacher/my-tests, teacher.py:57-68) ───────────────
// Shapes: teacher_service.get_teacher_tests (:2216-2273).

export type TestLifecycleStatus = 'draft' | 'live' | 'review' | 'completed'

export interface TeacherTestSummary {
  id: string
  title: string
  subject: string
  status: TestLifecycleStatus | string
  total_questions: number
  actual_questions: number
  created_at: string | null
  published_at: string | null
  days_remaining: number
  submission_count: number
  class_id: string | null
  class_name: string | null
}

export function getMyTests(): Promise<{ tests: TeacherTestSummary[] }> {
  return apiData('/teacher/my-tests')
}

// ── Class overview (GET /teacher/classes/{id}/overview, :84-103) ─────
// Shapes: teacher_service.get_class_overview (:156-363).

export interface ClassTestReviewInfo {
  test_id: string
  test_title: string
  student_count: number
  submissions: number
  pending_count: number
  reviewed_count: number
  status: 'not_started' | 'in_progress' | 'completed' | 'claimed_by_other' | 'live'
  estimated_time_minutes: number
}

export interface ClassOverview {
  class_info: {
    id: string
    name: string
    grade: string
    subject: string
    student_count: number
    has_pending_review: boolean
    last_reviewed_at: string | null
  }
  tests: ClassTestReviewInfo[]
  weekly_summary: {
    week_start_date: string
    status: 'no_tests' | 'not_started' | 'partial' | 'all_reviewed'
    tests_reviewed: number
    tests_total: number
  }
}

export function getClassOverview(classId: string): Promise<ClassOverview> {
  return apiData(`/teacher/classes/${classId}/overview`)
}

// ── Student groups (GET .../student-groups, teacher.py:1159-1173) ────
// Shapes: teacher_service.get_class_student_groups (:3742-3882).
// NOTE: name + readiness word ONLY — the backend deliberately returns no
// raw scores here, and the web mirrors that (privacy, ARCHITECTURE §6.3).

export interface GroupedStudent {
  id: string
  full_name: string
  level: ReadinessCode | string
  level_display: string
}

export interface ClassStudentGroups {
  week_label: 'This Week' | 'Last Week' | 'AI Estimated'
  class_name: string
  subject: string
  total_students: number
  can_modify: boolean
  groups: { level: ReadinessCode; level_display: string; students: GroupedStudent[] }[]
}

export function getClassStudentGroups(classId: string): Promise<ClassStudentGroups> {
  return apiData(`/teacher/classes/${classId}/student-groups`)
}

// ── Suggestions (GET .../suggestions?test_id=, teacher.py:106-127) ───
// Shapes: teacher_service.get_class_suggestions (:369-530).

export interface StudentSuggestion {
  suggestion_id: string
  student_id: string
  student_first_name: string
  current_level: string
  current_level_display: string
  suggested_level: string
  suggested_level_display: string
  has_change: boolean
  observed_patterns: string[]
  validation_status: 'pending' | 'validated'
  test_id: string | null
  test_title: string | null
  validation_action?: ValidationAction
  final_level?: string
  final_level_display?: string
  previous_level: string | null
  previous_level_display: string | null
  worksheet_count: number
  /**
   * Metric-derived 0-100 composite (green=100/yellow=50/red=0 averaged,
   * teacher_service.py:505-515). NOT raw accuracy — but the web UI still
   * keeps it off individual rows to stay word-first like the Flutter app.
   */
  readiness_score: number | null
}

export interface SuggestionsList {
  week_start_date: string
  class_id: string
  suggestions: StudentSuggestion[]
  test_id?: string
  test_title?: string | null
}

export function getClassSuggestions(
  classId: string,
  testId?: string,
): Promise<SuggestionsList> {
  return apiData(`/teacher/classes/${classId}/suggestions`, {
    query: { test_id: testId },
  })
}

// ── Review sessions ───────────────────────────────────────────────────
// POST /teacher/classes/{id}/reviews/start?test_id= (teacher.py:130-158)

export interface ReviewSession {
  session_id: string | null
  class_id: string
  test_id: string | null
  week_start_date: string
  status: 'in_progress' | 'completed' | 'claimed_by_other'
  claimed_by_name?: string | null
  total_students: number
  students_reviewed: number
  started_at: string | null
}

export function startReviewSession(
  classId: string,
  testId?: string,
): Promise<ReviewSession> {
  return apiData(`/teacher/classes/${classId}/reviews/start`, {
    method: 'POST',
    query: { test_id: testId },
  })
}

// POST /teacher/suggestions/{id}/validate?time_spent_ms= (teacher.py:161-211)
// Body: { action, adjusted_level? } (schemas/teacher.py:126-134).

export interface ValidateResult {
  validation_id: string
  action: ValidationAction
  final_level: string
  final_level_display: string
  validated_at: string
}

export function validateSuggestion(
  suggestionId: string,
  action: ValidationAction,
  adjustedLevel?: ReadinessCode,
  timeSpentMs?: number,
): Promise<ValidateResult> {
  return apiData(`/teacher/suggestions/${suggestionId}/validate`, {
    method: 'POST',
    query: { time_spent_ms: timeSpentMs },
    body: { action, adjusted_level: adjustedLevel },
  })
}

// POST /teacher/reviews/{session_id}/complete (teacher.py:214-255)

export interface CompleteReviewResult {
  session_id: string
  status: string
  total_students: number
  students_reviewed: number
  total_time_ms: number
  total_time_display: string
  completed_at: string
}

export function completeReviewSession(sessionId: string): Promise<CompleteReviewResult> {
  return apiData(`/teacher/reviews/${sessionId}/complete`, { method: 'POST' })
}

// ── Bulk validation (teacher.py:568-596) ─────────────────────────────

export function bulkValidateSuggestions(
  classId: string,
  suggestionIds: string[],
  action: 'agree' | 'same' = 'agree',
): Promise<{ validated_count: number }> {
  return apiData(`/teacher/classes/${classId}/bulk-validate`, {
    method: 'POST',
    body: { suggestion_ids: suggestionIds, action },
  })
}

// ── Metric explainability (GET /teacher/suggestions/{id}/explanation,
//    teacher.py:280-291; shapes teacher_service.py:1280-1357) ─────────

export interface MetricDetail {
  /** Obfuscated m01-m15 code as stored in student_metrics. */
  code: string
  name: string
  current_value: number
  previous_value: number
  change_pct: number
  direction: 'up' | 'down' | 'stable'
  explanation: string
}

export interface SuggestionExplanation {
  suggestion_id: string
  student_first_name: string
  current_level: string
  suggested_level: string
  ai_summary: string
  metrics: MetricDetail[]
}

export function getSuggestionExplanation(
  suggestionId: string,
): Promise<SuggestionExplanation> {
  return apiData(`/teacher/suggestions/${suggestionId}/explanation`)
}

// ── Student trend (GET /teacher/students/{id}/trend, teacher.py:262-273)

export interface StudentTrend {
  student_id: string
  student_first_name: string
  current_level: string
  current_level_display: string
  weeks: { week_start_date: string; level: string; level_display: string }[]
}

export function getStudentTrend(studentId: string): Promise<StudentTrend> {
  return apiData(`/teacher/students/${studentId}/trend`)
}

// ── Flags (POST/GET /teacher/students/{id}/flags, teacher.py:298-331) ─

export type FlagCategory =
  | 'needs_conversation'
  | 'potential_anxiety'
  | 'disengaged'
  | 'excelling'

export interface StudentFlag {
  id: string
  student_id: string
  category: FlagCategory | string
  note: string | null
  status: string
  notify_principal: boolean
  notify_parent: boolean
  created_at: string
}

export function getStudentFlags(studentId: string): Promise<{ flags: StudentFlag[] }> {
  return apiData(`/teacher/students/${studentId}/flags`)
}

export function createStudentFlag(
  studentId: string,
  input: {
    category: FlagCategory
    note?: string
    notify_principal?: boolean
    notify_parent?: boolean
  },
  classId?: string,
): Promise<StudentFlag> {
  return apiData(`/teacher/students/${studentId}/flags`, {
    method: 'POST',
    query: { class_id: classId },
    body: input,
  })
}

// ── Notes (POST/GET /teacher/students/{id}/notes, teacher.py:338-370) ─

export interface TeacherNote {
  id: string
  content: string
  week_start_date: string
  readiness_level: string | null
  validation_action: string | null
  created_at: string
}

export interface TeacherNotesList {
  student_id: string
  student_first_name: string
  notes: TeacherNote[]
}

export function getTeacherNotes(studentId: string): Promise<TeacherNotesList> {
  return apiData(`/teacher/students/${studentId}/notes`)
}

export function createTeacherNote(
  studentId: string,
  content: string,
  classId?: string,
): Promise<TeacherNote> {
  return apiData(`/teacher/students/${studentId}/notes`, {
    method: 'POST',
    query: { class_id: classId },
    body: { content },
  })
}

// ── Interventions (GET /teacher/students/{id}/interventions, :643-654)

export interface Intervention {
  title: string
  description: string
  effort: 'low' | 'medium' | 'high'
  icon: string
}

export interface InterventionsData {
  student_first_name: string
  current_level: string
  current_level_display: string
  strategies: Intervention[]
  general_tips: string[]
}

export function getInterventions(studentId: string): Promise<InterventionsData> {
  return apiData(`/teacher/students/${studentId}/interventions`)
}

// ── Multi-subject view (GET /teacher/students/{id}/subjects, :679-690)

export interface SubjectReadiness {
  subject: string
  class_id: string
  level: string
  level_display: string
  trend: 'up' | 'down' | 'stable'
}

export interface MultiSubjectView {
  student_id: string
  student_first_name: string
  subjects: SubjectReadiness[]
  insights: string[]
}

export function getMultiSubjectView(studentId: string): Promise<MultiSubjectView> {
  return apiData(`/teacher/students/${studentId}/subjects`)
}

// ── Parent message (POST /teacher/students/{id}/parent-message, :603-621)

export type ParentMessageTemplate =
  | 'positive_progress'
  | 'needs_support'
  | 'check_in'
  | 'custom'

export function sendParentMessage(
  studentId: string,
  input: {
    template_type: ParentMessageTemplate
    message_body: string
    include_level: boolean
  },
): Promise<{ message_id: string; sent_at: string }> {
  return apiData(`/teacher/students/${studentId}/parent-message`, {
    method: 'POST',
    body: input,
  })
}

// ── Weekly summary (GET /teacher/classes/{id}/summary, :377-388) ─────

export interface WeeklySummary {
  class_id: string
  class_name: string
  week_start_date: string
  total_students: number
  movement: { moved_up: number; stayed: number; moved_down: number }
  distribution: LevelDistribution[]
  highlights: { student_first_name: string; description: string; change_type: string }[]
}

export function getWeeklySummary(classId: string): Promise<WeeklySummary> {
  return apiData(`/teacher/classes/${classId}/summary`)
}

// ── Readiness distribution, 4-week window (teacher.py:1208-1301) ─────

export interface ReadinessDistribution {
  period: string
  total_students: number
  distribution: LevelDistribution[]
}

export function getReadinessDistribution(classId: string): Promise<ReadinessDistribution> {
  return apiData(`/teacher/classes/${classId}/readiness-distribution`)
}

// ── Class comparison (GET /teacher/classes/compare, :526-534) ────────

export interface ClassComparison {
  classes: {
    class_id: string
    class_name: string
    grade: string
    subject: string
    student_count: number
    distribution: LevelDistribution[]
  }[]
  insights: { title: string; description: string }[]
}

export function getClassComparison(): Promise<ClassComparison> {
  return apiData('/teacher/classes/compare')
}

// ── Class score analytics (GET .../score-analytics, teacher.py:425-441)
// CLASS-LEVEL aggregate averages only (no per-student scores) — mirrors
// the Flutter "Class Analytics" sheet (class_analytics_screen.dart).

export interface ClassScoreAnalytics {
  class_id: string
  current_avg: number
  previous_avg: number
  trend_pct: number
  per_test: {
    test_id: string
    test_title: string
    week_start_date: string | null
    avg_score_pct: number
    students_attempted: number
  }[]
  total_tests: number
}

export function getClassScoreAnalytics(
  classId: string,
  limit = 8,
): Promise<ClassScoreAnalytics> {
  return apiData(`/teacher/classes/${classId}/score-analytics`, { query: { limit } })
}

// ── Teacher self-analytics (GET /teacher/analytics, :628-636) ────────

export interface TeacherAnalytics {
  total_reviews: number
  total_students_reviewed: number
  avg_time_per_student_ms: number
  decision_breakdown: {
    agree_pct: number
    same_pct: number
    adjust_pct: number
    total_decisions: number
  }
  ai_alignment_pct: number
  weekly_stats: { week: string; students: number; time_ms: number | null }[]
}

export function getTeacherAnalytics(): Promise<TeacherAnalytics> {
  return apiData('/teacher/analytics')
}

// ── Notification preferences (GET/PUT /teacher/notifications/preferences,
//    teacher.py:541-561; shape teacher_service.py:2001-2016).
// NOTE: teacher preferences are reminder day/time + per-type toggles.
// Quiet-hours fields exist only for student/parent/principal roles
// (backend/app/api/notifications.py) — there is NO teacher quiet-hours
// endpoint, so the web mirrors exactly what the teacher role supports.

export interface TeacherNotificationPreferences {
  weekly_reminder_enabled: boolean
  reminder_day: string
  /** "HH:MM" 24h */
  reminder_time: string
  notify_level_changes: boolean
  notify_flag_updates: boolean
  notify_principal_messages: boolean
}

export function getNotificationPreferences(): Promise<TeacherNotificationPreferences> {
  return apiData('/teacher/notifications/preferences')
}

export function updateNotificationPreferences(
  prefs: TeacherNotificationPreferences,
): Promise<TeacherNotificationPreferences> {
  return apiData('/teacher/notifications/preferences', { method: 'PUT', body: prefs })
}

// ── Test attempt status (GET /teacher/tests/{id}/attempt-status,
//    teacher.py:448-462; shapes teacher_service.py:1601-1702) ─────────

export interface AttemptStatusStudent {
  id: string
  full_name: string
  roll_number: string | null
  completed_at?: string | null
  current_question_number?: number
  total_questions?: number
  percent?: number
}

export interface TestAttemptStatus {
  test_id: string
  test_title: string
  class_id: string
  class_name: string | null
  /** Server-computed deadline — render verbatim, never recompute (§9.9). */
  deadline: string | null
  total_students: number
  not_started: AttemptStatusStudent[]
  in_progress: AttemptStatusStudent[]
  completed: AttemptStatusStudent[]
}

export function getTestAttemptStatus(testId: string): Promise<TestAttemptStatus> {
  return apiData(`/teacher/tests/${testId}/attempt-status`)
}

// ── Reminders (POST /teacher/tests/{id}/remind[/{student_id}],
//    teacher.py:469-519). Omitting student_ids reminds all not-started. ─

export interface RemindResult {
  test_id?: string
  sent: number
  skipped: number
  total_targets?: number
}

export function remindStudents(
  testId: string,
  studentIds?: string[],
): Promise<RemindResult> {
  return apiData(`/teacher/tests/${testId}/remind`, {
    method: 'POST',
    body: { student_ids: studentIds ?? null },
  })
}

// ── Question bank chapters (GET /teacher/question-banks/chapters,
//    teacher.py:1326-1381) ─────────────────────────────────────────────

export interface QuestionBankChapter {
  bank_id: string
  chapter_number: number
  chapter_name: string
  subject: string
  total_questions: number
  simple_count: number
  medium_count: number
  hard_count: number
  is_available: boolean
}

export function getQuestionBankChapters(
  classId?: string,
): Promise<{ chapters: QuestionBankChapter[]; board?: string }> {
  return apiData('/teacher/question-banks/chapters', { query: { class_id: classId } })
}

// ── Paper flow: 10-slot review model ──────────────────────────────────

export type PaperDifficulty = 'Easy' | 'Mixed' | 'Hard'

/**
 * Distribution preview, mirroring question_bank_service.py:812-826
 * (_get_distribution): Easy → all Simple; Mixed → Medium=int(0.4N), rest
 * Simple; Hard → Hard=int(0.2N), Medium=int(0.3N), rest Simple.
 * For N=10: Easy 10S / Mixed 6S+4M / Hard 5S+3M+2H. Display-only — the
 * backend recomputes this server-side at generation time.
 */
export function distributionFor(
  difficulty: PaperDifficulty,
  total = 10,
): { simple: number; medium: number; hard: number } {
  if (difficulty === 'Easy') return { simple: total, medium: 0, hard: 0 }
  if (difficulty === 'Mixed') {
    const medium = Math.floor(0.4 * total)
    return { simple: total - medium, medium, hard: 0 }
  }
  const hard = Math.floor(0.2 * total)
  const medium = Math.floor(0.3 * total)
  return { simple: total - medium - hard, medium, hard }
}

export interface ReviewState {
  slot_question_ids: string[]
  pool_question_ids?: string[]
  accepted_ids?: string[]
  rejected_ids?: string[]
  current_index: number
  review_phase: 'reviewing' | 'final_draft'
  bank_ids?: string[]
  used_bank_question_ids?: string[]
  difficulty?: string
}

export interface PaperQuestion {
  id: string
  number: number
  type: string
  marks: number
  text: string
  options: string[] | null
  expected_answer: string
  hint?: string
  solution?: string
  difficulty?: string
  topic?: string
}

export interface DraftReview {
  test_id: string
  title?: string
  review_state: ReviewState
  questions: PaperQuestion[]
  config?: {
    subject_name: string | null
    class_id: string | null
    class_name: string
    grade: string
  }
  /** True when generate-and-draft found an existing draft for the class
   *  (teacher_service.py:2902-2906) — offer "continue or start fresh". */
  existing_draft?: boolean
}

/**
 * POST /teacher/paper/generate-and-draft (teacher.py:811-825).
 * Question-bank payload mirrors the Flutter client exactly
 * (create_practice_screen.dart:230-247): source='question_bank', bank_ids,
 * difficulty, total_questions, target_count, title, duration, class_id,
 * plus the always-required prompt fields (board_code/grade/subject_code/
 * subject_name/chapter_names/paper_type, schemas/teacher.py:632-653).
 */
export interface GenerateAndDraftConfig {
  source: 'question_bank'
  bank_ids: string[]
  difficulty: PaperDifficulty
  total_questions: number
  target_count: number
  title: string
  duration: number
  class_id: string | null
  board_code: string
  grade: number
  subject_code: string
  subject_name: string
  chapter_names: string[]
  paper_type: 'practice'
  force_new?: boolean
}

export function generateAndDraft(config: GenerateAndDraftConfig): Promise<DraftReview> {
  return apiData('/teacher/paper/generate-and-draft', { method: 'POST', body: config })
}

/** POST /teacher/paper/{test_id}/reject-question (teacher.py:828-849).
 *  Same-difficulty replacement from the bank pool (teacher_service.py:3127-3278). */
export function rejectAndReplaceQuestion(
  testId: string,
  questionId: string,
): Promise<{
  replacement: PaperQuestion | null
  bank_exhausted: boolean
  review_state: ReviewState
}> {
  return apiData(`/teacher/paper/${testId}/reject-question`, {
    method: 'POST',
    body: { question_id: questionId },
  })
}

/** PUT /teacher/paper/{test_id}/review-state (teacher.py:852-865).
 *  Backend protects slot/rejected/pool/bank fields from overwrite
 *  (teacher_service.py:3300-3308) — only send phase/index. */
export function updateReviewState(
  testId: string,
  reviewState: Partial<Pick<ReviewState, 'current_index' | 'review_phase'>>,
): Promise<{ test_id: string; review_state: ReviewState }> {
  return apiData(`/teacher/paper/${testId}/review-state`, {
    method: 'PUT',
    body: { review_state: reviewState },
  })
}

/** GET /teacher/paper/{test_id}/review (teacher.py:868-880) — resume a draft. */
export function getDraftReview(testId: string): Promise<DraftReview> {
  return apiData(`/teacher/paper/${testId}/review`)
}

// ── Draft/test content as paper (GET /teacher/paper/{test_id},
//    teacher.py:887-899; shapes teacher_service.py:3539-3630) ──────────

export interface GeneratedPaper {
  test_id: string
  title: string
  instructions: string
  duration_minutes: number
  total_marks: number
  sections: { name: string; questions: PaperQuestion[] }[]
  status: TestLifecycleStatus | string
  class_id: string | null
  subject: string
  class_name: string
  grade: string
}

export function getTestAsPaper(testId: string): Promise<GeneratedPaper> {
  return apiData(`/teacher/paper/${testId}`)
}

/** POST /teacher/paper/{test_id}/publish (teacher.py:902-937).
 *  Server sets deadline = Sunday of NEXT week 23:59:59 (models/test.py:16-26).
 *  ALWAYS display the returned `deadline` — never recompute client-side. */
export interface PublishResult {
  test_id: string
  title: string
  status: string
  published_at: string | null
  deadline: string | null
}

export function publishDraftTest(testId: string): Promise<PublishResult> {
  return apiData(`/teacher/paper/${testId}/publish`, { method: 'POST' })
}

/** POST /teacher/paper/{test_id}/reset (teacher.py:940-952) — delete a draft. */
export function resetDraftTest(
  testId: string,
): Promise<{ test_id: string; title: string; class_id: string | null; subject: string }> {
  return apiData(`/teacher/paper/${testId}/reset`, { method: 'POST' })
}

// ── Assignment acceptance workflow (teacher.py:959-1156) ─────────────

export interface PendingAssignment {
  id: string
  class_id: string
  class_name: string
  grade: string
  subject: string
  is_primary: boolean
  assigned_at: string | null
}

export function getPendingAssignments(): Promise<{
  pending_count: number
  assignments: PendingAssignment[]
}> {
  return apiData('/teacher/assignments/pending')
}

export function acceptAssignment(assignmentId: string): Promise<{
  message: string
  class_id: string
  class_name: string
  status: string
  is_late_acceptance: boolean
  late_penalty_message?: string
}> {
  return apiData(`/teacher/assignments/${assignmentId}/accept`, { method: 'POST' })
}

/** Rejection reason travels as a QUERY param (teacher.py:1099-1104). */
export function rejectAssignment(
  assignmentId: string,
  reason?: string,
): Promise<{ message: string; class_id: string; class_name: string; status: string }> {
  return apiData(`/teacher/assignments/${assignmentId}/reject`, {
    method: 'POST',
    query: { reason },
  })
}
