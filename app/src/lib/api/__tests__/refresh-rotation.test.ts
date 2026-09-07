/**
 * WS-D: the web client opts into refresh-token rotation and adopts the rotated token.
 * Drives api() through a 401 -> POST /auth/refresh -> retry sequence with a mocked fetch.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ROTATION_CAPABILITY } from '../client'
import { tokenStore } from '../../auth/tokens'

/** In-memory Storage: jsdom's localStorage is unavailable in this test environment on recent
 *  Node (the global resolves to Node's experimental stub), so give tokens.ts a real one. */
function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    clear: () => m.clear(),
    getItem: (k: string) => m.get(k) ?? null,
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => { m.delete(k) },
    setItem: (k: string, v: string) => { m.set(k, String(v)) },
  } as Storage
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('refresh-token rotation (WS-D)', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: memoryStorage(), configurable: true })
    tokenStore.save({ access: 'old-access', refresh: 'old-refresh', role: 'student' })
  })
  afterEach(() => vi.restoreAllMocks())

  it('sends the rotation capability on refresh and stores the rotated refresh token', async () => {
    const calls: { url: string; init?: RequestInit }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init })
        if (url.endsWith('/auth/refresh')) {
          return jsonResponse(200, {
            success: true,
            data: { access_token: 'new-access', expires_in: 900, refresh_token: 'new-refresh' },
          })
        }
        // first call with the old token -> 401, the retry with the new token -> 200
        const auth = (init?.headers as Record<string, string>)?.Authorization
        return auth === 'Bearer new-access'
          ? jsonResponse(200, { success: true, data: { ok: true } })
          : jsonResponse(401, { detail: 'expired' })
      }),
    )

    const out = await api<{ success: boolean; data: { ok: boolean } }>('/student/gamification')
    expect(out.data.ok).toBe(true)

    const refreshCall = calls.find((c) => c.url.endsWith('/auth/refresh'))
    expect(refreshCall).toBeDefined()
    const headers = refreshCall!.init!.headers as Record<string, string>
    expect(headers['X-Client-Capabilities']).toBe(ROTATION_CAPABILITY)
    expect(headers['X-Client']).toBe('web')
    expect(JSON.parse(refreshCall!.init!.body as string)).toEqual({ refresh_token: 'old-refresh' })

    expect(tokenStore.access).toBe('new-access')
    expect(tokenStore.refresh).toBe('new-refresh')            // rotated token adopted
    expect(calls.filter((c) => c.url.endsWith('/student/gamification'))).toHaveLength(2) // 401 then retry
  })

  it('keeps the stored refresh token when the server does not rotate (legacy response)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith('/auth/refresh')) {
          return jsonResponse(200, { success: true, data: { access_token: 'new-access', expires_in: 900 } })
        }
        const auth = (init?.headers as Record<string, string>)?.Authorization
        return auth === 'Bearer new-access'
          ? jsonResponse(200, { success: true, data: {} })
          : jsonResponse(401, { detail: 'expired' })
      }),
    )
    await api('/student/profile')
    expect(tokenStore.access).toBe('new-access')
    expect(tokenStore.refresh).toBe('old-refresh')
  })
})
