/**
 * ApiError → friendly, non-judgmental copy. Codes come from
 * backend/app/utils/helpers.py error_response() callers.
 */
import { ApiError } from './client'

const FALLBACK = 'Something went wrong on our side. Please try again.'

export function friendlyError(e: unknown, fallback = FALLBACK): string {
  if (!(e instanceof ApiError)) return fallback

  if (e.status === 429 || e.code === 'RATE_LIMITED') {
    if (e.retryAfter && e.retryAfter > 0) {
      const mins = Math.max(1, Math.ceil(e.retryAfter / 60))
      return `Too many attempts. Please try again in ${mins} minute${mins > 1 ? 's' : ''}.`
    }
    return e.message || 'Too many attempts — take a short break and try again.'
  }

  switch (e.code) {
    case 'ACCOUNT_DISABLED':
      return e.message || 'This account is not active yet. Please contact your school.'
    case 'INVALID_CREDENTIALS':
      return e.message || "That didn't match our records. Please check and try again."
    case 'DEVICE_LIMIT_REACHED':
      return (
        e.message ||
        "You're already signed in on 2 devices. Log out from one of them first."
      )
    case 'USERNAME_TAKEN':
      return 'That username is already taken — try a different one.'
    case 'INVALID_CODE':
      return 'That code doesn’t look right. Please check it and try again.'
    case 'CODE_ALREADY_USED':
      return 'This invite code has already been used. Ask your principal for a new one.'
    case 'CODE_EXPIRED':
      return 'This invite code has expired. Ask your principal for a fresh one.'
    case 'OTP_INVALID':
    case 'OTP_SEND_FAILED':
    case 'RESEND_FAILED':
    case 'RESET_FAILED':
      return e.message || 'That code didn’t work. Please try again.'
    default:
      break
  }

  if (e.status === 0) return e.message // network error copy from client.ts
  if (e.status >= 500) return 'Our servers are catching their breath. Please try again in a moment.'
  return e.message || fallback
}
