/**
 * Principal-facing endpoints: school dashboard, readiness heatmap + class
 * detail (aggregate counts only — never student names in charts), teacher
 * directory/approvals/invite codes, class assignment, student search +
 * detail, school/class/student confidence metrics, teacher insights,
 * notify-teacher and profile email change.
 *
 * Request/response shapes mirror the backend exactly:
 *   backend/app/api/principal.py — responses are built INLINE in the router
 *   (no separate service), line references below point there.
 * All payloads arrive wrapped in { success, data } (see envelope.ts).
 *
 * NOTE on params: several principal endpoints take scalar arguments as
 * QUERY params (FastAPI default for non-model params) — e.g. approve,
 * assign/unassign, notify, invite-code generation. Mirrored faithfully.
 */
import { apiData } from './envelope'
import type { TeacherAnalytics } from './teacher'

// ── Dashboard (principal.py:40-170) ──────────────────────────────────

export interface ReadinessCounts {
  avoidant: number
  attempting: number
  practicing: number
  confident: number
  competition_ready: number
}

export interface PrincipalDashboard {
  school: {
    id: string
    name: string
    code: string
    total_classes: number
    total_teachers: number
    total_students: number
  }
  readiness_summary: {
    period: string
    overall_health: 'mixed' | 'strong' | string
    total_assessed: number
    distribution: ReadinessCounts
    quick_stats: {
      classes_needing_attention: number
      classes_doing_well: number
      pending_teacher_approvals: number
    }
  }
  governance_summary: {
    pending_approvals: number
    active_teachers: number
    inactive_teachers: number
  }
}

export function getPrincipalDashboard(): Promise<PrincipalDashboard> {
  return apiData('/principal/dashboard')
}

// ── Readiness overview (principal.py:177-226) ────────────────────────

export interface ReadinessOverview {
  period: string
  classes: {
    class_id: string
    class_name: string
    subjects: {
      subject: string
      avoidant_pct: number
      attempting_pct: number
      practicing_pct: number
      confident_plus_pct: number
      health_status: string
    }[]
  }[]
}

export function getReadinessOverview(classId?: string): Promise<ReadinessOverview> {
  return apiData('/principal/readiness/overview', { query: { class_id: classId } })
}

// ── Heatmap (principal.py:279-385) ───────────────────────────────────
// One status per class×subject cell over a rolling 4-week window (the
// backend collapses weeks — it is NOT a per-week grid). Counts only.

export type HeatmapStatus = 'high_avoidance' | 'mixed' | 'strong'

export interface HeatmapData {
  period: string
  classes: string[]
  subjects: string[]
  cells: {
    class: string
    class_id: string
    subject: string
    status: HeatmapStatus | string
    teacher_name: string | null
  }[]
  legend: Record<string, { color: string; label: string }>
}

export function getHeatmap(): Promise<HeatmapData> {
  return apiData('/principal/readiness/heatmap')
}

// ── Class readiness detail (principal.py:388-483) ────────────────────

export interface ClassReadinessDetail {
  class_name: string
  subject: string
  period: string
  teacher_name: string | null
  distribution: {
    avoidant: { count: number; label: string }
    attempting: { count: number; label: string }
    practicing: { count: number; label: string }
    confident_plus: { count: number; label: string }
  }
  total_students: number
  teacher_assigned: boolean
  actions: { action: string; label: string; enabled: boolean }[]
}

export function getClassReadinessDetail(classId: string): Promise<ClassReadinessDetail> {
  return apiData(`/principal/readiness/class/${classId}`)
}

// ── Teacher directory (principal.py:490-546) ─────────────────────────

export interface DirectoryTeacher {
  id: string
  full_name: string
  username: string
  email: string | null
  status: 'active' | 'inactive'
  classes: string[]
}

export interface PendingApproval {
  id: string
  teacher_name: string
  teacher_email: string | null
  requested_username: string
  requested_at: string | null
}

export function getTeacherDirectory(): Promise<{
  teachers: DirectoryTeacher[]
  pending_approvals: PendingApproval[]
}> {
  return apiData('/principal/directory/teachers')
}

// ── Teacher detail / edit / reset (principal.py:549-683) ─────────────

export interface TeacherDetailData {
  teacher: {
    id: string
    full_name: string
    username: string
    email: string | null
    phone: string | null
    is_active: boolean
    created_at: string | null
    last_login_at: string | null
  }
  assigned_classes: string[]
  available_classes: { id: string; name: string; grade: string; subject: string }[]
}

export function getTeacherDetail(teacherId: string): Promise<TeacherDetailData> {
  return apiData(`/principal/directory/teachers/${teacherId}`)
}

/** is_active travels as a QUERY param (principal.py:598-603). */
export function updateTeacherStatus(
  teacherId: string,
  isActive: boolean,
): Promise<{ id: string; is_active: boolean; message: string }> {
  return apiData(`/principal/directory/teachers/${teacherId}`, {
    method: 'PATCH',
    query: { is_active: isActive },
  })
}

export function resetTeacherPassword(
  teacherId: string,
): Promise<{ temporary_password: string; message: string }> {
  return apiData(`/principal/directory/teachers/${teacherId}/reset-password`, {
    method: 'POST',
  })
}

// ── Approval queue (principal.py:686-789) ────────────────────────────
// approval_id + action are QUERY params; initial_classes (optional) is the
// JSON body (bare array — FastAPI List body param).

export interface ApproveTeacherResult {
  teacher_id?: string
  username?: string
  temporary_password?: string
  message: string
}

export function approveTeacher(
  approvalId: string,
  action: 'approve' | 'decline',
  initialClasses?: string[],
): Promise<ApproveTeacherResult> {
  return apiData('/principal/directory/teachers/approve', {
    method: 'POST',
    query: { approval_id: approvalId, action },
    body: initialClasses && initialClasses.length > 0 ? initialClasses : undefined,
  })
}

// ── Classes (principal.py:792-846) ───────────────────────────────────

export interface ClassTeacherAssignment {
  id: string
  full_name: string
  is_primary: boolean
  status: 'pending' | 'accepted' | 'rejected' | string
  assigned_at: string | null
  responded_at: string | null
  rejection_reason: string | null
}

export interface PrincipalClass {
  id: string
  name: string
  grade: string
  section: string
  subject: string
  academic_year: string | null
  teachers: ClassTeacherAssignment[]
  student_count: number
}

export function getPrincipalClasses(): Promise<{ classes: PrincipalClass[] }> {
  return apiData('/principal/directory/classes')
}

/** teacher_id / is_primary are QUERY params (principal.py:849-855). */
export function assignTeacherToClass(
  classId: string,
  teacherId: string,
  isPrimary = true,
): Promise<{ message: string; status?: string; class_name?: string }> {
  return apiData(`/principal/directory/classes/${classId}/assign`, {
    method: 'POST',
    query: { teacher_id: teacherId, is_primary: isPrimary },
  })
}

export function unassignTeacherFromClass(
  classId: string,
  teacherId: string,
): Promise<{ message: string }> {
  return apiData(`/principal/directory/classes/${classId}/unassign`, {
    method: 'DELETE',
    query: { teacher_id: teacherId },
  })
}

// ── Notify teacher (principal.py:973-1072) ───────────────────────────

export type NotifyMessageType =
  | 'attention_needed'
  | 'encouragement'
  | 'doing_well'
  | 'review_results'
  | 'review_reminder'
  | 'general'

/** All params travel as QUERY params (principal.py:974-978). */
export function notifyClassTeacher(
  classId: string,
  messageType: NotifyMessageType,
  customNote?: string,
): Promise<{ message: string }> {
  return apiData('/principal/notifications/teacher', {
    method: 'POST',
    query: { class_id: classId, message_type: messageType, custom_note: customNote },
  })
}

// ── Invite codes (principal.py:1079-1173) ────────────────────────────

export interface InviteCode {
  id?: string
  code: string
  teacher_name: string | null
  created_at?: string | null
  expires_at: string | null
  remaining_seconds: number
}

/** teacher_name travels as a QUERY param (principal.py:1080-1081). */
export function generateInviteCode(teacherName?: string): Promise<InviteCode> {
  return apiData('/principal/invite-codes/generate', {
    method: 'POST',
    query: { teacher_name: teacherName || undefined },
  })
}

export function getInviteCodes(): Promise<{ codes: InviteCode[] }> {
  return apiData('/principal/invite-codes')
}

// ── Student search (principal.py:1180-1262) ──────────────────────────

export interface StudentSearchItem {
  id: string
  full_name: string
  username: string
  class_grade: string
  class_name: string | null
  readiness_label: string
  sessions_completed: number
  last_active: string | null
}

export interface StudentSearchResult {
  items: StudentSearchItem[]
  pagination: { page: number; per_page: number; total_items: number; total_pages: number }
}

export function searchStudents(
  search?: string,
  page = 1,
  perPage = 20,
): Promise<StudentSearchResult> {
  return apiData('/principal/students', {
    query: { search: search || undefined, page, per_page: perPage },
  })
}

// ── Student progress (principal.py:1265-1447) ────────────────────────

export interface StudentProgressData {
  student: {
    id: string
    full_name: string
    username: string
    class_grade: string
    class_name: string | null
  }
  readiness: { current_level: string; current_level_display: string }
  activity: {
    total_sessions: number
    completed_sessions: number
    current_streak_days: number
    last_active: string | null
  }
  tests: {
    test_id: string
    test_title: string
    subject: string
    week_number: number
    status: 'completed' | 'in_progress' | string
    attempts: number
    /** metric-derived 0-100 composite or null (principal.py:1405) */
    readiness_score: number | null
    total_questions: number
  }[]
}

export function getStudentProgress(studentId: string): Promise<StudentProgressData> {
  return apiData(`/principal/students/${studentId}/progress`)
}

// ── Student journey / subject summary (principal.py:1868-1927) ───────
// These reuse the parent service computations — same shapes as the parent
// full-journey and subject-summary payloads.

export type { FullJourneyData, SubjectSummaryData } from './parent'
import type { FullJourneyData, SubjectSummaryData } from './parent'

export function getStudentJourney(studentId: string): Promise<FullJourneyData> {
  return apiData(`/principal/students/${studentId}/journey`)
}

export function getStudentSubjectSummary(studentId: string): Promise<SubjectSummaryData> {
  return apiData(`/principal/students/${studentId}/subject-summary`)
}

// ── Confidence metrics (principal.py:1549-1861) ──────────────────────

export interface MetricSummary {
  name: string
  description: string
  average_value: number
  students_measured: number
  distribution: { green: number; yellow: number; red: number }
  health_percentage: number
  status?: 'green' | 'yellow' | 'red' | 'unknown'
}

export interface SchoolMetricsData {
  school_name: string
  total_students: number
  students_with_metrics: number
  metrics: Record<string, MetricSummary>
  insights: { type: 'warning' | 'success'; metric: string; message: string; health: number }[]
}

export function getSchoolMetrics(): Promise<SchoolMetricsData> {
  return apiData('/principal/metrics/school')
}

export interface ClassMetricsData {
  class_name: string
  grade?: string
  subject?: string
  total_students: number
  students_with_metrics: number
  metrics: Record<string, MetricSummary>
  weak_areas: { metric: string; name: string; health: number; recommendation: string }[]
  strong_areas: { metric: string; name: string; health: number }[]
}

export function getClassMetrics(classId: string): Promise<ClassMetricsData> {
  return apiData(`/principal/metrics/class/${classId}`)
}

export interface StudentMetricsData {
  student: {
    id: string
    full_name: string
    username: string
    class_grade: string
    class_name: string | null
  }
  readiness: { level: number; label: string }
  metrics: Record<
    string,
    {
      name: string
      description: string
      status: 'green' | 'yellow' | 'red' | 'neutral' | 'unknown' | string
      interpretation: string
      raw_data?: Record<string, unknown>
    }
  >
  summary: { green_count: number; yellow_count: number; red_count: number }
}

export function getStudentMetrics(studentId: string): Promise<StudentMetricsData> {
  return apiData(`/principal/metrics/student/${studentId}`)
}

// ── Teacher insights (principal.py:1934-1955) ────────────────────────

export interface TeacherInsightsData extends TeacherAnalytics {
  teacher_name: string
}

export function getTeacherInsights(teacherId: string): Promise<TeacherInsightsData> {
  return apiData(`/principal/teachers/${teacherId}/insights`)
}

// ── Profile + email change (principal.py:1962-2050) ──────────────────

export interface PrincipalProfileData {
  id: string
  full_name: string
  email: string | null
  email_verified: boolean
  school_name: string | null
  school_code: string | null
}

export function getPrincipalProfile(): Promise<PrincipalProfileData> {
  return apiData('/principal/profile')
}

export function sendPrincipalEmailChangeOtp(newEmail: string): Promise<{ message: string }> {
  return apiData('/principal/profile/update-email/send-otp', {
    method: 'POST',
    body: { new_email: newEmail },
  })
}

export function verifyPrincipalEmailChange(
  newEmail: string,
  otpCode: string,
): Promise<{ message: string; email: string; email_verified: boolean }> {
  return apiData('/principal/profile/update-email/verify', {
    method: 'POST',
    body: { new_email: newEmail, otp_code: otpCode },
  })
}
