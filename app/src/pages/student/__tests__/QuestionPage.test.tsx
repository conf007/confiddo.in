/**
 * WS-E / WS-F behaviour tests for the question page:
 *  - renders question N from the session BUNDLE (one fetch) and reports it as viewed;
 *  - on 409 VERSION_CONFLICT from submit, stores the server version and re-hydrates by
 *    navigating to the session's current question instead of racing.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Outlet, RouterProvider, createMemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api/client'
import * as sessionsApi from '../../../lib/api/sessions'
import { QuestionPage } from '../QuestionPage'
import { initTracked, loadTracked } from '../session/tracker'

vi.mock('../../../lib/api/sessions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/api/sessions')>()
  return {
    ...actual,
    getSessionBundle: vi.fn(),
    markQuestionsViewed: vi.fn(async () => ({ created: 1 })),
    submitAnswer: vi.fn(),
    getQuestion: vi.fn(() => {
      throw new Error('per-question GET must not be used when the bundle is available')
    }),
  }
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
    current_question_number: 2, total_questions: 3, is_revision: false, version: 4,
  },
  questions: [q(1), q(2), q(3)],
  attempts: { '1': { viewed: true, answered: true, selected_option_id: 'q1-A', is_correct: true, hints_used: 0, solution_viewed: false, persisted_after_wrong: false, gave_up_after_wrong: false } },
}

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
    [{ element: <PathSpy />, children: [{ path: '/student/sessions/:sid/q/:n', element: <QuestionPage /> }, { path: '/student', element: <div>home</div> }] }],
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

describe('QuestionPage with the session bundle (WS-E)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.mocked(sessionsApi.getSessionBundle).mockResolvedValue(bundle)
    vi.mocked(sessionsApi.markQuestionsViewed).mockClear()
    initTracked({ sessionId: 's1', testId: 't1', totalQuestions: 3, isRevision: false, isLate: false })
  })

  it('renders question 2 from the bundle, reports it viewed, and adopts the bundle version', async () => {
    renderAt('/student/sessions/s1/q/2')
    expect(await screen.findByText('Question 2 text')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /option B of 2/ })).toBeInTheDocument()
    expect(sessionsApi.getSessionBundle).toHaveBeenCalledWith('s1')
    await waitFor(() => expect(sessionsApi.markQuestionsViewed).toHaveBeenCalledWith('s1', [2]))
    await waitFor(() => expect(loadTracked('s1')?.version).toBe(4))
  })

  it('on 409 VERSION_CONFLICT re-hydrates: stores the server version and jumps to the current question (WS-F)', async () => {
    vi.mocked(sessionsApi.submitAnswer).mockRejectedValue(
      new ApiError(409, 'This session changed on another device.', 'VERSION_CONFLICT', {
        success: false,
        error: {
          code: 'VERSION_CONFLICT',
          message: 'moved',
          current: { version: 9, status: 'in_progress', current_question_number: 3 },
        },
      }),
    )
    // after the conflict the page refetches the bundle — the server now reports version 9 at Q3
    vi.mocked(sessionsApi.getSessionBundle)
      .mockResolvedValueOnce(bundle)
      .mockResolvedValue({ ...bundle, session: { ...bundle.session, version: 9, current_question_number: 3 } })
    renderAt('/student/sessions/s1/q/2')
    await screen.findByText('Question 2 text')
    fireEvent.click(screen.getByRole('radio', { name: /option B of 2/ }))
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }))
    await waitFor(() => expect(sessionsApi.submitAnswer).toHaveBeenCalled())
    // expected_version sent = the bundle's version (4)
    expect(vi.mocked(sessionsApi.submitAnswer).mock.calls[0][4]).toBe(4)
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/student/sessions/s1/q/3'))
    await waitFor(() => expect(loadTracked('s1')?.version).toBe(9))
    expect(await screen.findByText('Question 3 text')).toBeInTheDocument()
  })

  it('on VERSION_CONFLICT for a session finished elsewhere, goes home', async () => {
    vi.mocked(sessionsApi.submitAnswer).mockRejectedValue(
      new ApiError(409, 'done elsewhere', 'VERSION_CONFLICT', {
        success: false,
        error: { code: 'VERSION_CONFLICT', message: 'x', current: { version: 12, status: 'completed', current_question_number: 3 } },
      }),
    )
    renderAt('/student/sessions/s1/q/2')
    await screen.findByText('Question 2 text')
    fireEvent.click(screen.getByRole('radio', { name: /option C of 2/ }))
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }))
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/student'))
  })
})
