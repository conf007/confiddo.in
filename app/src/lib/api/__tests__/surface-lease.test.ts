import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../client'
import { sessionLockOf, surfaceLabel } from '../sessions'
import { surfaceId, tokenStore } from '../../auth/tokens'

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

describe('surface identity headers', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: memoryStorage(), configurable: true })
    tokenStore.save({ access: 'a', refresh: 'r', role: 'student' })
  })
  afterEach(() => vi.restoreAllMocks())

  it('sends X-Surface-Id and X-Surface-Kind on authenticated requests, with one id per browser', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({ success: true, data: {} }), { status: 200 }),
    )
    await api('/student/profile')
    await api('/student/sessions', { method: 'POST', body: {} })
    const headers = fetchMock.mock.calls.map((c) => (c[1] as RequestInit).headers as Record<string, string>)
    expect(headers[0]['X-Surface-Kind']).toBe('web')
    expect(headers[0]['X-Surface-Id']).toMatch(/^web-[0-9a-f-]{36}$/)
    expect(headers[1]['X-Surface-Id']).toBe(headers[0]['X-Surface-Id'])
    expect(headers[0]['X-Surface-Id']).toBe(surfaceId())
  })

  it('keeps the surface id across logout', () => {
    const id = surfaceId()
    tokenStore.clear()
    expect(surfaceId()).toBe(id)
  })

  it('does not send surface headers on unauthenticated requests', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({ success: true, data: {} }), { status: 200 }),
    )
    await api('/auth/student/login', { method: 'POST', body: {}, auth: false })
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers['X-Surface-Id']).toBeUndefined()
  })
})

describe('sessionLockOf', () => {
  const lock = (extra: Record<string, unknown> = {}) =>
    new ApiError(423, 'locked', 'SESSION_LOCKED_OTHER_SURFACE', {
      success: false,
      error: {
        code: 'SESSION_LOCKED_OTHER_SURFACE',
        message: 'locked',
        session_id: 's1',
        surface_kind: 'app-legacy',
        seconds_remaining: 42,
        taken_over: false,
        version: 7,
        ...extra,
      },
    })

  it('parses the 423 payload', () => {
    expect(sessionLockOf(lock())).toEqual({
      session_id: 's1',
      surface_kind: 'app-legacy',
      seconds_remaining: 42,
      taken_over: false,
      version: 7,
    })
    expect(sessionLockOf(lock({ taken_over: true }))?.taken_over).toBe(true)
  })

  it('ignores other errors', () => {
    expect(sessionLockOf(new ApiError(409, 'x', 'VERSION_CONFLICT'))).toBeNull()
    expect(sessionLockOf(new ApiError(423, 'x', 'OTHER'))).toBeNull()
    expect(sessionLockOf(new Error('x'))).toBeNull()
  })

  it('names the other surface for the student', () => {
    expect(surfaceLabel('app')).toBe('your app')
    expect(surfaceLabel('app-legacy')).toBe('your app')
    expect(surfaceLabel('web')).toBe('another browser')
    expect(surfaceLabel(null)).toBe('another device')
  })
})
