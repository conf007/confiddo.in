import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Outlet, RouterProvider, createMemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api/client'
import * as sessionsApi from '../../../lib/api/sessions'
import * as studentApi from '../../../lib/api/student'
import { QuestionPage } from '../QuestionPage'
import { TestStartPage } from '../TestStartPage'
import { initTracked, loadTracked } from '../session/tracker'

vi.mock('../../../lib/api/sessions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/api/sessions')>()
  return {
    ...actual,
    getSessionBundle: vi.fn(),
    markQuestionsViewed: vi.fn(async () => ({ created: 1 })),
    submitAnswer: vi.fn(),
    takeOverSession: vi.fn(),
    renewLease: vi.fn(async () => ({ version: 1, status: 'in_progress', lease: {} })),
    createSession: vi.fn(),
  }
})
vi.mock('../../../lib/api/student', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/api/student')>()
  return { ...actual, getStudentTests: vi.fn() }
})

const q = (n: number) => ({
  id: `q${n}`,
  question_number: n,
  question_text: `Question ${n} text`,
  options: ['A', 'B', 'C', 'D'].map((label) => ({ id: `q${n}-${label}`, label, text: `option ${label} of ${n}` })),
})

const bundle: sessionsApi.SessionBundle = {
  session: {
    session_id: 's1', test_id: 't1', status: 'in_progress', session_type: 'practice',
    current_question_number: 1, total_questions: 2, is_revision: false, version: 4,
  },
  questions: [q(1), q(2)],
  attempts: {},
}

const locked = (taken_over = false, surface_kind = 'app-legacy') =>
  new ApiError(423, 'locked', 'SESSION_LOCKED_OTHER_SURFACE', {
    success: false,
    error: { code: 'SESSION_LOCKED_OTHER_SURFACE', message: 'locked', session_id: 's1', surface_kind, seconds_remaining: 50, taken_over, version: 4 },
  })

function PathSpy() {
  const loc = useLocation()
  return (
    <>
      <div data-testid="path">{loc.pathname}</div>
      <Outlet />
    </>
  )
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [{
      element: <PathSpy />,
      children: [
        { path: '/student/sessions/:sid/q/:n', element: <QuestionPage /> },
        { path: '/student/tests/:testId/start', element: <TestStartPage /> },
        { path: '/student', element: <div>home</div> },
      ],
    }],
    { initialEntries: [path] },
  )
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe('QuestionPage under the session lease', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.mocked(sessionsApi.getSessionBundle).mockReset()
    vi.mocked(sessionsApi.takeOverSession).mockReset()
    vi.mocked(sessionsApi.submitAnswer).mockReset()
    initTracked({ sessionId: 's1', testId: 't1', totalQuestions: 2, isRevision: false, isLate: false })
  })

  it('shows the interstitial on 423, takes over on request, then re-hydrates the bundle', async () => {
    vi.mocked(sessionsApi.getSessionBundle).mockRejectedValueOnce(locked()).mockResolvedValue({ ...bundle, session: { ...bundle.session, version: 6 } })
    vi.mocked(sessionsApi.takeOverSession).mockResolvedValue({
      session_id: 's1', status: 'in_progress', current_question_number: 1, version: 6, transferred: true,
      lease: { surface_kind: 'web', held_by_me: true, seconds_remaining: 60, ttl_seconds: 60, takeover_count: 1, enforced: true },
    })
    renderAt('/student/sessions/s1/q/1')
    expect(await screen.findByTestId('session-locked')).toBeInTheDocument()
    expect(screen.getByText('This test is open on your app.')).toBeInTheDocument()
    expect(screen.queryByText('Question 1 text')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue here' }))
    await waitFor(() => expect(sessionsApi.takeOverSession).toHaveBeenCalledWith('s1'))
    expect(await screen.findByText('Question 1 text')).toBeInTheDocument()
    expect(screen.queryByTestId('session-locked')).not.toBeInTheDocument()
    await waitFor(() => expect(loadTracked('s1')?.version).toBe(6))
  })

  it('hydrates answers recorded by the other surface from the bundle', async () => {
    vi.mocked(sessionsApi.getSessionBundle).mockResolvedValue({
      ...bundle,
      session: { ...bundle.session, current_question_number: 2 },
      attempts: {
        '1': { viewed: true, answered: true, selected_option_id: 'q1-B', is_correct: false, hints_used: 1, solution_viewed: false, persisted_after_wrong: false, gave_up_after_wrong: false },
      },
    })
    renderAt('/student/sessions/s1/q/2')
    await screen.findByText('Question 2 text')
    await waitFor(() => expect(loadTracked('s1')?.questions[1]).toMatchObject({
      questionId: 'q1', answered: true, isCorrect: false, selectedOptionId: 'q1-B', hintViewed: true, submissions: 1,
    }))
    expect(loadTracked('s1')?.questions[2]?.answered ?? false).toBe(false)
  })

  it('locks the page for good when this surface was taken over mid-test', async () => {
    vi.mocked(sessionsApi.getSessionBundle).mockResolvedValue(bundle)
    vi.mocked(sessionsApi.submitAnswer).mockRejectedValue(locked(true, 'web'))
    renderAt('/student/sessions/s1/q/1')
    await screen.findByText('Question 1 text')
    fireEvent.click(screen.getByRole('radio', { name: /option B of 1/ }))
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }))
    expect(await screen.findByTestId('session-taken-over')).toBeInTheDocument()
    expect(screen.getByText('This test was continued on another device.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue here' })).not.toBeInTheDocument()
    expect(sessionsApi.submitAnswer).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Back to home' }))
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/student'))
  })
})

describe('TestStartPage under the session lease', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.mocked(studentApi.getStudentTests).mockResolvedValue({
      tests: [{
        id: 't1', title: 'Fractions', subject: 'Maths', week_number: 3, release_date: '2026-09-01',
        estimated_duration_minutes: 10, total_questions: 2, is_active: true, created_at: '2026-09-01', session_status: 'in_progress',
      }],
    })
    vi.mocked(sessionsApi.createSession).mockReset()
    vi.mocked(sessionsApi.takeOverSession).mockReset()
  })

  it('offers a takeover when resume is refused, then resumes here', async () => {
    vi.mocked(sessionsApi.createSession).mockRejectedValueOnce(locked()).mockResolvedValue({
      session_id: 's1', test_id: 't1', status: 'in_progress', current_question_number: 2, total_questions: 2, is_revision: false, is_late: false, version: 6,
    })
    vi.mocked(sessionsApi.takeOverSession).mockResolvedValue({
      session_id: 's1', status: 'in_progress', current_question_number: 2, version: 6, transferred: true,
      lease: { surface_kind: 'web', held_by_me: true, seconds_remaining: 60, ttl_seconds: 60, takeover_count: 1, enforced: true },
    })
    vi.mocked(sessionsApi.getSessionBundle).mockResolvedValue({ ...bundle, session: { ...bundle.session, current_question_number: 2 } })
    renderAt('/student/tests/t1/start')
    fireEvent.click(await screen.findByRole('button', { name: /resume where i left off/i }))
    expect(await screen.findByTestId('session-locked')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue here' }))
    await waitFor(() => expect(sessionsApi.takeOverSession).toHaveBeenCalledWith('s1'))
    await waitFor(() => expect(sessionsApi.createSession).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/student/sessions/s1/q/2'))
  })
})
