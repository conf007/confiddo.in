/**
 * Parent-facing endpoints: children + linking, devices (2-device cap),
 * weekly narrative summaries, growth cards, activity feed, engagement,
 * conversation starters, learning insights, home goals, monthly report,
 * achievements/performance share cards, exam guide, readiness explainer
 * and profile email change.
 *
 * Request/response shapes mirror the backend exactly:
 *   backend/app/api/parent.py               (router prefix /parent)
 *   backend/app/services/parent_service.py  (response dict shapes)
 * All payloads arrive wrapped in { success, data } (see envelope.ts).
 * Line references below are into parent_service.py unless noted.
 *
 * PRIVACY (ARCHITECTURE.md §6.3): parents see NARRATIVES ONLY — no raw
 * scores, no percentages, no peer comparison. A few service fields leak
 * metric-derived 0-100 composites (e.g. progress_percent, soft_skills,
 * best_subject_score); they are typed here for completeness but the UI
 * must never render them as numbers (effort words/bars only).
 */
import { apiData } from './envelope'

// Same flag the student side already uses (lib/api/student.ts) — the parent
// class-ranking endpoint tensions "no peer comparison" and stays hidden
// behind it (default OFF). See ARCHITECTURE.md §6.3 / §9.1.
export { CLASS_RANKINGS_ENABLED } from './student'

// ── Children (GET /parent/children, parent_service.py:50-87) ─────────

export interface ParentChild {
  id: string
  first_name: string
  grade: string
  school_name: string
  has_new_summary: boolean
}

export function getChildren(): Promise<{ children: ParentChild[] }> {
  return apiData('/parent/children')
}

// ── Link / unlink (parent.py:38-146) ─────────────────────────────────
// Error codes: INVALID_CODE / CODE_ALREADY_USED / CODE_EXPIRED /
// ALREADY_LINKED — backend messages are parent-appropriate, surface them.

export interface LinkChildResult {
  message: string
  child: {
    id: string
    name: string | null
    school_name: string | null
    grade: string | null
  }
}

export function linkChild(linkingCode: string): Promise<LinkChildResult> {
  return apiData('/parent/link-child', {
    method: 'POST',
    body: { linking_code: linkingCode },
  })
}

export function unlinkChild(childId: string): Promise<{ message: string }> {
  return apiData(`/parent/children/${childId}/unlink`, { method: 'DELETE' })
}

// ── Devices (parent.py:153-227) ──────────────────────────────────────

export interface ParentDevice {
  id: string
  device_name: string
  login_at: string | null
  last_active_at: string | null
  is_stale: boolean
}

export interface ParentDevicesData {
  devices: ParentDevice[]
  max_devices: number
  current_count: number
}

export function getDevices(): Promise<ParentDevicesData> {
  return apiData('/parent/devices')
}

export function removeDevice(deviceId: string): Promise<{ message: string }> {
  return apiData(`/parent/devices/${deviceId}`, { method: 'DELETE' })
}

/** Call every ~5 min while the parent app is open (parent.py:210-227). */
export function deviceHeartbeat(): Promise<{ updated: boolean }> {
  return apiData('/parent/devices/heartbeat', { method: 'POST' })
}

// ── Weekly summary (parent.py:230-250; shape :93-171) ────────────────

/** shape: parent_service.py:127-147 (trends JSON objects per the Flutter
 *  TrendModel — area/status/icon). */
export interface SummaryTrend {
  area: string
  /** "Improved" | "Stable" | "Developing" */
  status: string
  icon?: string
}

export interface GrowthCard {
  id: string
  card_type: string
  headline: string
  description: string | null
  child_name: string
  subject: string
  share_code: string | null
  share_message: string
}

export interface ChildSummary {
  child_first_name: string
  period_start: string
  period_end: string
  period_display: string
  headline: string
  narrative: string
  trends: SummaryTrend[]
  support_suggestion: string | null
  what_this_means: string | null
  growth_card: GrowthCard | null
}

export function getChildSummary(childId: string): Promise<ChildSummary> {
  return apiData(`/parent/children/${childId}/summary`)
}

// ── Summary history + detail (parent_service.py:173-275) ─────────────

export interface SummaryListItem {
  id: string
  period_start: string
  period_end: string
  period_display: string
  headline: string
}

export function getSummaryHistory(
  childId: string,
): Promise<{ child_first_name: string; summaries: SummaryListItem[] }> {
  return apiData(`/parent/children/${childId}/summaries`)
}

export function getSummaryById(summaryId: string): Promise<ChildSummary> {
  return apiData(`/parent/summaries/${summaryId}`)
}

// ── Growth card share (parent_service.py:281-321) ────────────────────

export interface ShareCardResult {
  card_id: string
  share_code: string
  share_message: string
  times_shared: number
}

export function shareGrowthCard(cardId: string): Promise<ShareCardResult> {
  return apiData(`/parent/cards/${cardId}/share`, { method: 'POST' })
}

// ── Subject summary (parent_service.py:1308-1741) ────────────────────
// NOTE: progress fields are metric-derived composites; the parent UI shows
// readiness WORDS + behavioral observations only, never the numbers.

export interface BehavioralObservation {
  text: string
  status: 'green' | 'yellow' | 'red' | string
}

export interface SubjectWeeklyProgress {
  week: number
  /** metric-derived 0-100 — DO NOT render as a number */
  progress: number
  sessions: number
  questions: number
}

export interface SubjectSummaryEntry {
  name: string
  icon: string
  color: string
  /** metric-derived 0-100 — DO NOT render as a number */
  progress_percent: number
  progress_change: number
  session_count: number
  worksheets_done: number
  worksheets_total: number
  questions_count: number
  insight: string
  weekly_progress: SubjectWeeklyProgress[]
  topic_breakdown: { confident: string[]; improving: string[]; needs_help: string[] }
  readiness_group: 'confident' | 'practicing' | 'needs_help' | 'not_started' | string
  readiness_level?: string
  readiness_level_display?: string
  behavioral_observations?: BehavioralObservation[]
  [key: string]: unknown
}

export interface SubjectSummaryData {
  child_id: string
  child_first_name: string
  period: { start: string; end: string }
  overall_stats: { total_sessions: number; overall_progress: number; streak: number }
  subjects: SubjectSummaryEntry[]
}

export function getSubjectSummary(childId: string): Promise<SubjectSummaryData> {
  return apiData(`/parent/children/${childId}/subject-summary`)
}

// ── 4-week progress, paged (parent_service.py:2777-3025) ─────────────

export interface PagedWeekCell {
  week: number
  week_start: string
  level: string | null
  level_display: string | null
  class_avg_level: string | null
  class_avg_display: string | null
}

export interface PagedSubjectProgress {
  name: string
  icon: string
  color: string
  weeks: PagedWeekCell[]
  trend: 'up' | 'down' | 'stable'
  comparison: 'above' | 'below' | 'at' | null
  [key: string]: unknown
}

export interface ProgressInsights {
  attention: { subject: string; message: string }[]
  positive: { subject: string; message: string }[]
}

export interface PagedFourWeekProgress {
  child_first_name: string
  page: number
  total_pages: number
  period: { start: string; end: string }
  week_labels: string[]
  subjects: PagedSubjectProgress[]
  insights: ProgressInsights
}

export function getPagedFourWeekProgress(
  childId: string,
  page = 0,
): Promise<PagedFourWeekProgress> {
  return apiData(`/parent/children/${childId}/four-week-progress-paged`, {
    query: { page },
  })
}

// ── Full journey (parent_service.py:3027-3363) ───────────────────────

export interface JourneyWeek {
  week_index: number
  week_start: string
  child_level: string | null
  class_avg_level: string | null
}

export interface JourneySubject {
  name: string
  icon: string
  color: string
  weeks: JourneyWeek[]
  levels_gained: number
  current_level: string | null
  current_display: string | null
  topic_breakdown: { confident: string[]; improving: string[]; needs_help: string[] }
}

export interface FullJourneyData {
  child_first_name: string
  total_weeks: number
  week_labels: string[]
  subjects: JourneySubject[]
  summary_stats: {
    weeks_tracked: number
    levels_gained?: number
    current_avg_level: string | null
    current_avg_display: string | null
  }
  insights: { type: 'positive' | 'attention' | string; subject: string; message: string }[]
}

export function getFullJourney(childId: string): Promise<FullJourneyData> {
  return apiData(`/parent/children/${childId}/full-journey`)
}

// ── Topic movement (parent_service.py:3374-3488) ─────────────────────

export interface TopicMovement {
  topic: string
  from_category: string
  to_category: string
}

export function getTopicMovement(
  childId: string,
): Promise<{ movements: Record<string, TopicMovement[]> }> {
  return apiData(`/parent/children/${childId}/topic-movement`)
}

// ── Activity feed (parent_service.py:382-556) ────────────────────────

export interface ActivityFeedItem {
  date: string
  test_title: string
  narrative: string
  sessions_count: number
  questions_practiced: number
  topics: string[]
  highlights: string[]
  behavioral_highlights: BehavioralObservation[]
}

export function getActivityFeed(
  childId: string,
  subject?: string,
): Promise<{ child_first_name: string; items: ActivityFeedItem[] }> {
  return apiData(`/parent/children/${childId}/activity-feed`, {
    query: { subject },
  })
}

// ── Engagement dashboard (parent_service.py:562-663) ─────────────────

export interface EngagementData {
  child_first_name: string
  streak_calendar: { date: string; active: boolean }[]
  weekly_sessions: { week_label: string; count: number }[]
  engagement_ring: { done: number; goal: number }
  persistence_level: 'Strong' | 'Growing' | 'Developing' | string
  total_practice_days: number
  current_streak: number
}

export function getEngagement(childId: string): Promise<EngagementData> {
  return apiData(`/parent/children/${childId}/engagement`)
}

// ── Conversation starters (parent_service.py:669-769) ────────────────

export interface ConversationStarter {
  id: string
  date: string
  question_text: string
  was_asked: boolean
}

export function getConversationStarters(childId: string): Promise<{
  child_first_name: string
  today: ConversationStarter
  history: ConversationStarter[]
}> {
  return apiData(`/parent/children/${childId}/conversation-starter`)
}

export function markStarterAsked(starterId: string): Promise<{ marked: boolean }> {
  return apiData(`/parent/conversation-starter/${starterId}/asked`, {
    method: 'POST',
  })
}

// ── Learning insights (parent_service.py:796-974) ────────────────────
// soft_skills are behavior-derived 0-100 values — render as qualitative
// effort bars, never numeric percentages.

export interface SoftSkills {
  persistence: number
  curiosity: number
  focus: number
  independence: number
  consistency: number
}

export interface LearningInsightsData {
  child_first_name: string
  status: 'ready' | 'insufficient_data' | 'no_data' | string
  status_message?: string
  insights: { icon: string; text: string; category: string }[]
  soft_skills: SoftSkills
  last_updated?: string
  required_tests: number
  current_tests: number
}

export function getLearningInsights(childId: string): Promise<LearningInsightsData> {
  return apiData(`/parent/children/${childId}/insights`)
}

// ── Home goals (parent_service.py:980-1101) ──────────────────────────

export type GoalType = 'practice_days' | 'session_count' | 'custom'

export interface HomeGoal {
  id: string
  goal_text: string
  goal_type: GoalType | string
  target_value: number
  current_value: number
  is_completed: boolean
  week_start: string
  created_at: string | null
}

export function getHomeGoals(childId: string): Promise<{
  child_first_name: string
  current_week: HomeGoal[]
  past_weeks: { week_start: string; goals: HomeGoal[] }[]
}> {
  return apiData(`/parent/children/${childId}/goals`)
}

export function createHomeGoal(
  childId: string,
  input: { goal_text: string; goal_type: GoalType; target_value: number },
): Promise<HomeGoal> {
  return apiData(`/parent/children/${childId}/goals`, {
    method: 'POST',
    body: input,
  })
}

/** current_value / is_completed travel as QUERY params (parent.py:486-499). */
export function updateHomeGoal(
  goalId: string,
  updates: { current_value?: number; is_completed?: boolean },
): Promise<HomeGoal> {
  return apiData(`/parent/goals/${goalId}`, {
    method: 'PATCH',
    query: updates,
  })
}

// ── Monthly report (parent_service.py:1134-1255) ─────────────────────

export interface MonthlyReportData {
  child_first_name: string
  month: number
  year: number
  month_label: string
  narrative: string
  effort_calendar: { date: string; active: boolean }[]
  total_sessions: number
  total_questions: number
  practice_days: number
  soft_skills_current: SoftSkills
  soft_skills_previous: SoftSkills | null
  recommendations: string[]
  share_text: string
}

export function getMonthlyReport(
  childId: string,
  month: number,
  year: number,
): Promise<MonthlyReportData> {
  return apiData(`/parent/children/${childId}/monthly-report`, {
    query: { month, year },
  })
}

// ── Achievements (parent_service.py:2356-2545) ───────────────────────

export interface Achievement {
  type: 'level_up' | 'top_ranker' | 'streak_milestone' | 'perfect_score' | 'progress' | string
  title: string
  subtitle: string
  message: string
  emoji: string
  stat_label: string
  stat_value: string
  secondary_stat_label: string
  secondary_stat_value: string
  color_hex: string
}

export function getAchievements(childId: string): Promise<{ achievements: Achievement[] }> {
  return apiData(`/parent/children/${childId}/achievements`)
}

// ── Performance card (parent.py:559-703) ─────────────────────────────
// best_subject_score is a metric composite — never rendered (effort-not-marks).

export interface PerformanceCardData {
  child_name: string
  class_grade: string
  school_name: string
  total_points: number
  current_streak: number
  level_name: string
  tests_completed: number
  total_tests: number
  subjects_practiced: string[]
  persistence_level: string
  practice_days_this_month: number
  best_subject: string
  /** DO NOT render — score composite (parent.py:702) */
  best_subject_score: number
}

export function getPerformanceCard(childId: string): Promise<PerformanceCardData> {
  return apiData(`/parent/children/${childId}/performance-card`)
}

// ── Readiness explainer (parent_service.py:2547-2607) ────────────────

export interface ChildReadinessData {
  child_first_name: string
  level: number
  label: string
  description: string
  factors: string[]
  green_count: number
  red_count: number
}

export function getChildReadiness(childId: string): Promise<ChildReadinessData> {
  return apiData(`/parent/children/${childId}/readiness`)
}

// ── Class ranking (parent.py:742-753; shape parent_service.py:2609-2678)
// PRIVACY-FLAGGED — only call when CLASS_RANKINGS_ENABLED.

export interface ClassRankingData {
  child_rank: number
  total_students: number
  child_points: number
  nearby_rankings: { rank: number; points: number; character: string; is_child: boolean }[]
}

export function getClassRanking(childId: string): Promise<ClassRankingData> {
  return apiData(`/parent/children/${childId}/class-ranking`)
}

// ── Exam guide (parent_service.py:2320-2350) ─────────────────────────

export interface ExamGuideArticle {
  id: string
  category: string
  title: string
  body: string
  display_order: number
}

export interface ExamGuideData {
  categories: string[]
  articles: ExamGuideArticle[]
  featured_tip: ExamGuideArticle | null
}

export function getExamGuide(category?: string): Promise<ExamGuideData> {
  return apiData('/parent/exam-guide', { query: { category } })
}

// ── Profile + email change (parent.py:817-903) ───────────────────────

export interface ParentProfileData {
  id: string
  full_name: string
  email: string | null
  email_verified: boolean
  phone: string | null
}

export function getParentProfile(): Promise<ParentProfileData> {
  return apiData('/parent/profile')
}

export function sendParentEmailChangeOtp(newEmail: string): Promise<{ message: string }> {
  return apiData('/parent/profile/update-email/send-otp', {
    method: 'POST',
    body: { new_email: newEmail },
  })
}

export function verifyParentEmailChange(
  newEmail: string,
  otpCode: string,
): Promise<{ message: string; email: string; email_verified: boolean }> {
  return apiData('/parent/profile/update-email/verify', {
    method: 'POST',
    body: { new_email: newEmail, otp_code: otpCode },
  })
}
