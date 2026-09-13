import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as studentApi from '../../../lib/api/student'
import { HistoryPage } from '../HistoryPage'
import { StudentProfilePage } from '../ProfilePage'
import historySource from '../HistoryPage.tsx?raw'
import lockGateSource from '../../../components/student/SessionLockGate.tsx?raw'

vi.mock('../../../lib/api/student', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/api/student')>()
  return { ...actual, getGamification: vi.fn(), getStudentProfile: vi.fn(), getStudentTests: vi.fn(), getAcademicSessions: vi.fn() }
})
vi.mock('../../../lib/auth/AuthContext', () => ({
  useAuth: () => ({ logout: vi.fn(), role: 'student', user: null }),
}))

const profile = (parent_has_logged_in: boolean): studentApi.StudentProfileData => ({
  id: 'st1', username: 'st1', full_name: 'Asha Rao', class_grade: '8', section: 'A', selected_character: 'luna',
  email: null, email_verified: false, parent_has_logged_in,
})

function renderIn(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProfilePage parent status', () => {
  beforeEach(() => {
    vi.mocked(studentApi.getGamification).mockResolvedValue({
      total_points: 45, current_streak: 1, longest_streak: 1, level: 0, level_name: 'Explorer', next_level_points: 50,
      current_level_points: 0, last_active_date: null, total_tests_completed: 1, total_practice_days: 1, weeks_with_activity: 1, perfect_test_count: 0,
    })
  })

  it('shows a linked, signed-in parent', async () => {
    vi.mocked(studentApi.getStudentProfile).mockResolvedValue(profile(true))
    renderIn(<StudentProfilePage />)
    expect(await screen.findByTestId('parent-status')).toHaveTextContent('Parent linked and signed in.')
    expect(screen.getByText('Playing as Luna — change character')).toBeInTheDocument()
  })

  it('shows when no parent has signed in', async () => {
    vi.mocked(studentApi.getStudentProfile).mockResolvedValue(profile(false))
    renderIn(<StudentProfilePage />)
    expect(await screen.findByTestId('parent-status')).toHaveTextContent('No parent has signed in yet.')
    expect(screen.getByText('Link a parent')).toBeInTheDocument()
  })
})

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.mocked(studentApi.getStudentTests).mockResolvedValue({ tests: [] })
    vi.mocked(studentApi.getAcademicSessions).mockResolvedValue({
      current_class: '8', current_section: 'A', current_school: 'DPS',
      sessions: [{
        academic_year: '2026-27', class_grade: '8', section: 'A', school_name: 'DPS', enrolled_at: null,
        subjects: [{
          id: 'sub1', name: 'Mathematics', class_name: '8-A', total_tests: 3, completed_tests: 1,
          tests: [
            { id: 't1', title: 'Fractions', week_number: 1, is_completed: true, is_in_progress: false },
            { id: 't2', title: 'Decimals', week_number: 2, is_completed: false, is_in_progress: true },
            { id: 't3', title: 'Ratios', week_number: 3, is_completed: false, is_in_progress: false },
          ],
        }],
      }],
    })
  })

  it('lists tests by year and subject with review, revise, resume and start entry points', async () => {
    renderIn(<HistoryPage />)
    expect(await screen.findByText('2026-27 · Class 8–A')).toBeInTheDocument()
    expect(screen.getByText('1/3 done')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/student/tests/t1/results')
    expect(screen.getByRole('link', { name: 'Revise' })).toHaveAttribute('href', '/student/tests/t1/start')
    expect(screen.getByRole('link', { name: 'Resume' })).toHaveAttribute('href', '/student/tests/t2/start')
    expect(screen.getByRole('link', { name: 'Start' })).toHaveAttribute('href', '/student/tests/t3/start')
  })

  it('new student pages never render a score, count of correct answers or percentage', () => {
    for (const src of [historySource, lockGateSource]) {
      for (const forbidden of ['score', 'accuracy', 'percent', 'correct_count', 'is_correct', 'You got']) {
        expect(src.includes(forbidden), `must not contain "${forbidden}"`).toBe(false)
      }
    }
  })
})
