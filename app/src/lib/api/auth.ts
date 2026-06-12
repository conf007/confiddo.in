/**
 * Auth endpoints — request/response shapes mirror the backend exactly:
 *   backend/app/api/auth.py            (5 role logins, register, refresh, logout)
 *   backend/app/api/password_reset.py  (forgot password/username, first-login)
 *   backend/app/schemas/auth.py, backend/app/schemas/password_reset.py
 * All payloads arrive wrapped in { success, data } (see envelope.ts).
 */
import { apiData } from './envelope'
import type { Role } from '../auth/tokens'

// ── Profile shapes (schemas/auth.py) ─────────────────────────────────

export interface BaseProfile {
  id: string
  username: string
  full_name: string
  is_first_login?: boolean
  email?: string | null
  email_verified?: boolean
}

export interface StudentProfile extends BaseProfile {
  class_grade: string
  section?: string | null
  school_name?: string | null
  selected_character?: string | null
  parent_has_logged_in?: boolean
}

export interface TeacherProfile extends BaseProfile {
  school_name?: string | null
}

export type ParentProfile = BaseProfile

export interface SchoolInfo {
  id: string
  name: string
  code?: string | null
}

export interface PrincipalProfile extends BaseProfile {
  /** principal | vice_principal | coordinator */
  role: string
  school?: SchoolInfo | null
}

export interface AdminProfile extends BaseProfile {
  email: string
  role: string
}

export type AnyProfile =
  | StudentProfile
  | TeacherProfile
  | ParentProfile
  | PrincipalProfile
  | AdminProfile

// ── Login / register (api/auth.py) ───────────────────────────────────

export interface LoginRequest {
  username: string
  password: string
  /** Required by the parent 2-device cap; harmless for other roles. */
  device_id?: string
  device_name?: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  is_first_login?: boolean
  student?: StudentProfile
  admin?: AdminProfile
  teacher?: TeacherProfile
  parent?: ParentProfile
  principal?: PrincipalProfile
}

/** POST /auth/{role}/login — role ∈ student|teacher|parent|principal|admin */
export function login(role: Role, body: LoginRequest): Promise<LoginResponse> {
  return apiData<LoginResponse>(`/auth/${role}/login`, {
    method: 'POST',
    body,
    auth: false,
  })
}

export interface TeacherRegisterRequest {
  invite_code: string // 6-char alphanumeric, uppercased
  username: string
  password: string
  full_name: string
  email?: string
  phone?: string
}

/** POST /auth/teacher/register — auto-logs-in (returns LoginResponse). */
export function registerTeacher(
  body: TeacherRegisterRequest,
): Promise<LoginResponse> {
  return apiData<LoginResponse>('/auth/teacher/register', {
    method: 'POST',
    body,
    auth: false,
  })
}

export interface ParentRegisterRequest {
  username: string
  password: string
  full_name: string
  phone?: string
}

/** POST /auth/parent/register — open registration, auto-logs-in. */
export function registerParent(
  body: ParentRegisterRequest,
): Promise<LoginResponse> {
  return apiData<LoginResponse>('/auth/parent/register', {
    method: 'POST',
    body,
    auth: false,
  })
}

/** POST /auth/logout — stateless on the server; best-effort. */
export function logout(): Promise<{ message: string }> {
  return apiData<{ message: string }>('/auth/logout', { method: 'POST' })
}

// ── Forgot password (api/password_reset.py, OTP flow) ────────────────

export type ResetRole = 'student' | 'teacher' | 'parent' | 'principal'

export interface OtpInitiateResponse {
  message: string
  masked_email: string | null
}

export function forgotPassword(
  username: string,
  role: ResetRole,
): Promise<OtpInitiateResponse> {
  return apiData<OtpInitiateResponse>('/auth/password-reset/forgot-password', {
    method: 'POST',
    body: { username, role },
    auth: false,
  })
}

export function forgotPasswordVerify(
  username: string,
  role: ResetRole,
  otpCode: string,
): Promise<{ message: string; reset_token: string }> {
  return apiData('/auth/password-reset/forgot-password/verify', {
    method: 'POST',
    body: { username, role, otp_code: otpCode },
    auth: false,
  })
}

export function forgotPasswordReset(
  resetToken: string,
  newPassword: string,
): Promise<{ message: string }> {
  return apiData('/auth/password-reset/forgot-password/reset', {
    method: 'POST',
    body: { reset_token: resetToken, new_password: newPassword },
    auth: false,
  })
}

// ── Forgot username ───────────────────────────────────────────────────

export interface MaskedAccount {
  user_id: string
  masked_username: string
  role: string
  full_name: string
  detail?: string | null
  school_name?: string | null
}

export function forgotUsername(
  identifier: string,
  role: ResetRole,
): Promise<OtpInitiateResponse> {
  return apiData<OtpInitiateResponse>('/auth/password-reset/forgot-username', {
    method: 'POST',
    body: { identifier, role },
    auth: false,
  })
}

export function forgotUsernameVerify(
  identifier: string,
  role: ResetRole,
  otpCode: string,
): Promise<{ message: string; accounts: MaskedAccount[] }> {
  return apiData('/auth/password-reset/forgot-username/verify', {
    method: 'POST',
    body: { identifier, role, otp_code: otpCode },
    auth: false,
  })
}

// ── First login (authenticated: mandatory reset + email OTP) ─────────

export function firstLoginReset(
  newPassword: string,
): Promise<{ message: string }> {
  return apiData('/auth/password-reset/first-login/reset', {
    method: 'POST',
    body: { new_password: newPassword },
  })
}

export interface EmailInfo {
  has_email: boolean
  masked_email: string | null
  email_verified?: boolean
}

export function firstLoginEmailInfo(): Promise<EmailInfo> {
  return apiData<EmailInfo>('/auth/password-reset/first-login/email-info', {
    method: 'POST',
  })
}

export function firstLoginSendEmailOtp(): Promise<{ message: string }> {
  return apiData('/auth/password-reset/first-login/send-email-otp', {
    method: 'POST',
  })
}

export function firstLoginVerifyEmail(
  otpCode: string,
): Promise<{ message: string }> {
  return apiData('/auth/password-reset/first-login/verify-email', {
    method: 'POST',
    body: { otp_code: otpCode },
  })
}

/** POST /auth/password-reset/resend-otp — needs the real email address. */
export function resendOtp(
  email: string,
  purpose: 'password_reset' | 'username_recovery' | 'email_verification',
): Promise<{ message: string }> {
  return apiData('/auth/password-reset/resend-otp', {
    method: 'POST',
    body: { email, purpose },
    auth: false,
  })
}
