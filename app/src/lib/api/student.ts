/**
 * Student-facing endpoints (non-session): home/test list, profile, character,
 * gamification, class rankings, parent linking, academic sessions, email change.
 *
 * Request/response shapes mirror the backend exactly:
 *   backend/app/api/student.py     (router prefix /student, api/__init__.py:8)
 *   backend/app/schemas/test.py    (TestWithSessionStatus :112-114)
 *   backend/app/services/gamification_service.py (get_student_gamification :422-441)
 * All payloads arrive wrapped in { success, data } (see envelope.ts).
 */
import { apiData } from './envelope'

// ── Feature flags ─────────────────────────────────────────────────────
/**
 * VITE_ENABLE_CLASS_RANKINGS (default OFF).
 *
 * GET /student/class-rankings returns a named, ranked XP leaderboard for the
 * student's grade+section (backend/app/api/student.py:176-227). This tensions
 * the product's "no peer comparison" privacy stance (ARCHITECTURE.md §6.3/§9.1)
 * and is an OPEN PRODUCT QUESTION. Until product decides, the web app hides
 * the leaderboard behind this flag and shows a self-progress "your journey"
 * view instead. Enable by setting VITE_ENABLE_CLASS_RANKINGS=true in .env.
 */
export const CLASS_RANKINGS_ENABLED =
  import.meta.env.VITE_ENABLE_CLASS_RANKINGS === 'true'

// ── Test list (GET /student/tests) ────────────────────────────────────

export type SessionStatus = 'not_started' | 'in_progress' | 'completed'

export interface StudentTest {
  id: string
  title: string
  subject: string
  description?: string | null
  week_number: number
  release_date: string // ISO date
  estimated_duration_minutes: number
  total_questions: number
  is_active: boolean
  created_at: string
  session_status: SessionStatus
  teacher_name?: string | null
  /**
   * TODO-parity: the backend's TestWithSessionStatus does NOT include the
   * test deadline today (backend/app/schemas/test.py:96-114) even though
   * Test.deadline exists on the model. If/when the backend adds it, the
   * countdown UI renders it verbatim — never recomputed client-side
   * (ARCHITECTURE.md §9.9: deadline = Sunday of the NEXT week, server-set).
   */
  deadline?: string | null
}

export function getStudentTests(): Promise<{ tests: StudentTest[] }> {
  return apiData('/student/tests')
}

// ── Profile (GET /student/profile, student.py:117-143) ───────────────

export interface StudentProfileData {
  id: string
  username: string
  full_name: string
  class_grade: string
  section: string
  school_name?: string | null
  selected_character: string
  email?: string | null
  email_verified: boolean
  parent_has_logged_in: boolean
}

export function getStudentProfile(): Promise<StudentProfileData> {
  return apiData('/student/profile')
}

// ── Character (PUT /student/character?character_id=..., :146-173) ────
// NOTE: character_id travels as a QUERY PARAM, not a body (matches the
// Flutter client, api_service.dart:156). The server validates the ID against
// the 18-name catalog but does NOT verify XP — the client must enforce the
// unlock gate (ARCHITECTURE.md §9.5) via src/lib/parity/characters.ts.

export function updateCharacter(
  characterId: string,
): Promise<{ selected_character: string; message: string }> {
  return apiData('/student/character', {
    method: 'PUT',
    query: { character_id: characterId },
  })
}

// ── Gamification (GET /student/gamification, service :422-441) ───────

export interface GamificationData {
  total_points: number
  current_streak: number
  longest_streak: number
  level: number
  level_name: string
  next_level_points: number | null
  current_level_points: number
  last_active_date: string | null
  total_tests_completed: number
  total_practice_days: number
  weeks_with_activity: number
  perfect_test_count: number
}

export function getGamification(): Promise<GamificationData> {
  return apiData('/student/gamification')
}

// ── Class rankings (GET /student/class-rankings, :176-227) ───────────
// Privacy-flagged — only call when CLASS_RANKINGS_ENABLED (see flag above).

export interface ClassRankingEntry {
  student_id: string
  name: string
  character: string
  total_points: number
  current_streak: number
  level: number
  is_current_user: boolean
  rank: number
}

export interface ClassRankingsData {
  rankings: ClassRankingEntry[]
  user_rank: number
  total_students: number
}

export function getClassRankings(): Promise<ClassRankingsData> {
  return apiData('/student/class-rankings')
}

// ── Parent link code (POST /student/parent-link-code, :245-301) ──────

export interface ParentLinkCodeData {
  code: string
  expires_at: string
  valid_hours: number
  message: string
}

export function generateParentLinkCode(): Promise<ParentLinkCodeData> {
  return apiData('/student/parent-link-code', { method: 'POST' })
}

// ── Academic sessions (GET /student/academic-sessions, :308-405) ─────

export interface AcademicSubjectTest {
  id: string
  title: string
  week_number: number
  is_completed: boolean
  is_in_progress: boolean
}

export interface AcademicSubject {
  id: string
  name: string
  class_name: string
  tests: AcademicSubjectTest[]
  total_tests: number
  completed_tests: number
}

export interface AcademicSession {
  academic_year: string
  class_grade: string
  section: string
  school_name?: string | null
  subjects: AcademicSubject[]
  enrolled_at?: string | null
}

export interface AcademicSessionsData {
  sessions: AcademicSession[]
  current_class: string
  current_section: string
  current_school?: string | null
}

export function getAcademicSessions(): Promise<AcademicSessionsData> {
  return apiData('/student/academic-sessions')
}

// ── Email change (POST /student/profile/update-email/*, :421-484) ────

export function sendEmailChangeOtp(
  newEmail: string,
): Promise<{ message: string }> {
  return apiData('/student/profile/update-email/send-otp', {
    method: 'POST',
    body: { new_email: newEmail },
  })
}

export function verifyEmailChange(
  newEmail: string,
  otpCode: string,
): Promise<{ message: string; email: string; email_verified: boolean }> {
  return apiData('/student/profile/update-email/verify', {
    method: 'POST',
    body: { new_email: newEmail, otp_code: otpCode },
  })
}
