/**
 * Single API client for the existing Confiddo backend (/v1).
 *
 * Mirrors frontend/lib/data/datasources/api_service.dart:
 *  - Bearer access token header
 *  - 401 → single-flight refresh (POST /auth/refresh) → retry once
 *  - transient network/5xx retry on GETs: 3 tries, 1 s exponential base
 *  - 60 s timeout
 * Backend stays authoritative for all metrics/XP/readiness computation.
 */
import { tokenStore } from '../auth/tokens'

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ??
  'https://conf007--confiddo-backend-fastapi-app.modal.run/v1'

export class ApiError extends Error {
  status: number
  /** Backend error code, e.g. PARENT_NOT_LOGGED_IN, TEST_ALREADY_COMPLETED */
  code?: string
  detail?: unknown
  retryAfter?: number

  constructor(status: number, message: string, code?: string, detail?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.detail = detail
  }
}

type Query = Record<string, string | number | boolean | undefined>

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Query
  /** false for login/refresh/public endpoints */
  auth?: boolean
  signal?: AbortSignal
}

/** WS-D refresh-token rotation capability (backend token_service.ROTATION_CAPABILITY). */
export const ROTATION_CAPABILITY = 'refresh-rotation'
export const CLIENT_LABEL = 'web'

const TIMEOUT_MS = 60_000
const GET_RETRIES = 3
const RETRY_BASE_MS = 1_000

let refreshInFlight: Promise<boolean> | null = null

/** Refresh the access token; single-flight so parallel 401s share one call. */
async function refreshTokens(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    const refresh = tokenStore.refresh
    if (!refresh) return false
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // WS-D: opt into single-use (rotating) refresh tokens. The backend then returns a new
          // refresh_token on every refresh and treats replay of the old one as theft.
          'X-Client-Capabilities': ROTATION_CAPABILITY,
          'X-Client': CLIENT_LABEL,
        },
        body: JSON.stringify({ refresh_token: refresh }),
      })
      if (!res.ok) return false
      const json = await res.json()
      // Backend wraps every response: { success, data: { access_token, expires_in,
      // refresh_token? } } (backend/app/utils/helpers.py api_response). Unwrap, with a
      // fallback for a bare payload just in case. A rotated refresh_token replaces the old
      // one; when absent (legacy server) the stored token is kept.
      const data = (json?.data ?? json) as {
        access_token?: string
        refresh_token?: string
      }
      const access = data.access_token
      if (!access) return false
      tokenStore.save({ access, refresh: data.refresh_token ?? null })
      return true
    } catch {
      return false
    }
  })().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_BASE_URL}${path}`)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v))
    }
  }
  return url.toString()
}

async function parseError(res: Response): Promise<ApiError> {
  let body: unknown
  try {
    body = await res.json()
  } catch {
    /* non-JSON error body */
  }
  // Confiddo backend shapes (backend/app/utils/helpers.py error_response):
  //   { detail: { success: false, error: { code, message, retry_after? } } }
  // FastAPI also produces { detail: "msg" } and, for 422 validation,
  //   { detail: [ { loc, msg, type }, ... ] }.
  const detail = (body as { detail?: unknown } | undefined)?.detail
  let message = res.statusText || `HTTP ${res.status}`
  let code: string | undefined
  let retryAfterBody: number | undefined
  if (typeof detail === 'string') {
    message = detail
  } else if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: unknown } | undefined
    if (first && typeof first.msg === 'string') message = first.msg
  } else if (detail && typeof detail === 'object') {
    const d = detail as Record<string, unknown>
    const nested =
      d.error && typeof d.error === 'object'
        ? (d.error as Record<string, unknown>)
        : undefined
    const msg = nested?.message ?? d.message
    if (typeof msg === 'string') message = msg
    else if (typeof d.error === 'string') message = d.error
    const c = nested?.code ?? d.code ?? d.error_code
    if (typeof c === 'string') code = c
    const ra = nested?.retry_after ?? d.retry_after
    if (typeof ra === 'number') retryAfterBody = ra
  }
  const err = new ApiError(res.status, message, code, detail)
  const ra = res.headers.get('Retry-After')
  if (ra) err.retryAfter = Number(ra)
  else if (retryAfterBody !== undefined) err.retryAfter = retryAfterBody
  return err
}

export async function api<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, query, auth = true, signal } = opts
  const url = buildUrl(path, query)
  const maxTries = method === 'GET' ? GET_RETRIES : 1
  let lastError: unknown
  let retriedAuth = false

  for (let attempt = 0; attempt < maxTries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    signal?.addEventListener('abort', () => controller.abort(), { once: true })
    try {
      const headers: Record<string, string> = {}
      if (body !== undefined) headers['Content-Type'] = 'application/json'
      if (auth && tokenStore.access) {
        headers['Authorization'] = `Bearer ${tokenStore.access}`
      }
      const res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      if (res.status === 401 && auth && !retriedAuth) {
        retriedAuth = true
        if (await refreshTokens()) {
          attempt-- // retry same attempt with the new token
          continue
        }
        tokenStore.clear()
        window.dispatchEvent(new CustomEvent('confiddo:logout'))
        throw await parseError(res)
      }

      if (res.status >= 500 && method === 'GET' && attempt < maxTries - 1) {
        lastError = await parseError(res)
      } else if (!res.ok) {
        throw await parseError(res)
      } else {
        if (res.status === 204) return undefined as T
        return (await res.json()) as T
      }
    } catch (e) {
      if (e instanceof ApiError) throw e
      lastError = e // network failure / timeout — retry GETs
      if (method !== 'GET' || attempt === maxTries - 1) {
        throw new ApiError(0, 'Network error — please check your connection.')
      }
    } finally {
      clearTimeout(timer)
    }
    await new Promise((r) => setTimeout(r, RETRY_BASE_MS * 2 ** attempt))
  }
  throw lastError instanceof ApiError
    ? lastError
    : new ApiError(0, 'Network error — please check your connection.')
}
