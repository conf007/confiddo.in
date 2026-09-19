import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OnboardingSheet } from '../../../components/OnboardingSheet'
import { XpQuickGuide } from '../../../components/student/XpQuickGuide'
import { AboutPage } from '../../../pages/AboutPage'
import { flushEvents, pendingEvents, recordEvent } from '../../../pages/student/session/events'
import * as eventsApi from '../events'
import { notificationTarget } from '../notificationTarget'
import type { AppNotification } from '../notifications'

vi.mock('../events', () => ({ postEventBatch: vi.fn(async () => ({ received: 1, processed: 1 })) }))

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

const n = (over: Partial<AppNotification>): AppNotification => ({
  id: 'n1', notification_type: 'new_test_available', title: 't', body: 'b', reference_type: 'test', reference_id: 'ref1',
  is_read: false, read_at: null, extra_data: {}, created_at: '2026-09-14T00:00:00Z', ...over,
})

describe('notificationTarget (S-25, PR-33)', () => {
  it('routes each role to the screen the app opens', () => {
    expect(notificationTarget('student', n({}))).toBe('/student/tests/ref1/start')
    expect(notificationTarget('teacher', n({ notification_type: 'review_pending', extra_data: { class_id: 'c1' } }))).toBe('/teacher/classes/c1/review?test_id=ref1')
    expect(notificationTarget('teacher', n({ reference_type: 'class' }))).toBe('/teacher/classes/ref1')
    expect(notificationTarget('teacher', n({ reference_type: 'student' }))).toBe('/teacher/students/ref1')
    expect(notificationTarget('principal', n({ reference_type: 'class' }))).toBe('/principal/classes/ref1')
    expect(notificationTarget('principal', n({ reference_type: 'student' }))).toBe('/principal/students/ref1')
    expect(notificationTarget('parent', n({ reference_type: 'analysis' }))).toBe('/parent/children/ref1')
    expect(notificationTarget('parent', n({ reference_type: 'class' }))).toBeNull()
    expect(notificationTarget('student', n({ reference_id: null }))).toBeNull()
  })
})

describe('behavioural events buffer (S-53)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.mocked(eventsApi.postEventBatch).mockClear()
  })

  it('numbers events per session and flushes them in order', async () => {
    recordEvent('s1', 'question_rendered', 'q1', { question_number: 1 })
    recordEvent('s1', 'option_selected', 'q1', { option_id: 'a' })
    expect(pendingEvents('s1').map((e) => e.sequence_number)).toEqual([1, 2])
    await flushEvents('s1')
    expect(eventsApi.postEventBatch).toHaveBeenCalledTimes(1)
    const [sid, batch] = vi.mocked(eventsApi.postEventBatch).mock.calls[0]
    expect(sid).toBe('s1')
    expect(batch.map((e) => e.event_type)).toEqual(['question_rendered', 'option_selected'])
    expect(pendingEvents('s1')).toEqual([])
  })

  it('keeps events when the batch fails and auto-flushes at ten', async () => {
    vi.mocked(eventsApi.postEventBatch).mockRejectedValueOnce(new Error('offline'))
    recordEvent('s2', 'hint_viewed', 'q1')
    await flushEvents('s2')
    expect(pendingEvents('s2')).toHaveLength(1)
    for (let i = 0; i < 9; i++) recordEvent('s2', 'option_selected', 'q1')
    await Promise.resolve()
    expect(eventsApi.postEventBatch).toHaveBeenCalledTimes(2)
    expect(vi.mocked(eventsApi.postEventBatch).mock.calls[1][1]).toHaveLength(10)
  })
})

describe('OnboardingSheet (S-15)', () => {
  beforeEach(() => Object.defineProperty(window, 'localStorage', { value: memoryStorage(), configurable: true }))
  afterEach(() => vi.restoreAllMocks())

  it('shows once, steps through the four slides, then remembers', () => {
    const { unmount } = render(<OnboardingSheet />)
    expect(screen.getByText('Built for You, Not for Your Marks')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(screen.getByRole('button', { name: "Let's go" }))
    expect(screen.queryByTestId('onboarding')).not.toBeInTheDocument()
    unmount()
    render(<OnboardingSheet />)
    expect(screen.queryByTestId('onboarding')).not.toBeInTheDocument()
  })
})

describe('AboutPage (S-23) and XpQuickGuide (S-41)', () => {
  it('renders the brand page', () => {
    render(<MemoryRouter><AboutPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'CONFIDDO' })).toBeInTheDocument()
    expect(screen.getByText('Our Mission')).toBeInTheDocument()
    for (const p of ['Readiness', 'Growth', 'Confidence']) expect(screen.getByText(p)).toBeInTheDocument()
  })

  it('lists the six quick rules with backend values', () => {
    render(<MemoryRouter><XpQuickGuide open onClose={() => undefined} /></MemoryRouter>)
    const list = screen.getByTestId('xp-quick-guide')
    expect(list).toHaveTextContent('Genuine attempt+4 XP')
    expect(list).toHaveTextContent('Skip (unreviewed)-2 XP')
    expect(screen.getByRole('link', { name: /see all xp rules/i })).toHaveAttribute('href', '/student/xp-rules')
  })
})
