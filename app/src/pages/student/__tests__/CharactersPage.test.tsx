import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api/client'
import * as studentApi from '../../../lib/api/student'
import { CharactersPage } from '../CharactersPage'

vi.mock('../../../lib/api/student', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/api/student')>()
  return { ...actual, getGamification: vi.fn(), getStudentProfile: vi.fn(), updateCharacter: vi.fn() }
})

const gamification = (total_points: number): studentApi.GamificationData => ({
  total_points, current_streak: 0, longest_streak: 0, level: 0, level_name: 'Explorer',
  next_level_points: 50, current_level_points: 0, last_active_date: null,
  total_tests_completed: 0, total_practice_days: 0, weeks_with_activity: 0, perfect_test_count: 0,
})

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CharactersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CharactersPage', () => {
  beforeEach(() => {
    vi.mocked(studentApi.getGamification).mockReset()
    vi.mocked(studentApi.getStudentProfile).mockReset()
    vi.mocked(studentApi.getStudentProfile).mockResolvedValue({
      id: 'st1', username: 'st1', full_name: 'Student', class_grade: '8', section: 'A', selected_character: 'ace',
      email_verified: false, parent_has_logged_in: true,
    })
    vi.mocked(studentApi.updateCharacter).mockReset()
  })

  it('renders all 18 characters with locked and unlocked states from the server XP', async () => {
    vi.mocked(studentApi.getGamification).mockResolvedValue(gamification(1200))
    renderPage()
    expect(await screen.findByText('7/18 unlocked')).toBeInTheDocument()
    expect(screen.getByText('Onyx')).toBeInTheDocument()
    expect(screen.getByText('1,500 XP')).toBeInTheDocument()
    expect(screen.getByText('Equipped')).toBeInTheDocument()
  })

  it('shows the server message on 403 CHARACTER_LOCKED and re-reads XP', async () => {
    vi.mocked(studentApi.getGamification).mockResolvedValue(gamification(1000))
    vi.mocked(studentApi.updateCharacter).mockRejectedValue(
      new ApiError(403, 'This character unlocks at 1000 XP.', 'CHARACTER_LOCKED', {
        success: false, error: { code: 'CHARACTER_LOCKED', message: 'This character unlocks at 1000 XP.' },
      }),
    )
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /^Onyx/ }))
    const fetchesBefore = vi.mocked(studentApi.getGamification).mock.calls.length
    fireEvent.click(await screen.findByRole('button', { name: 'Choose Onyx' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('This character unlocks at 1000 XP.')
    await waitFor(() => expect(vi.mocked(studentApi.getGamification).mock.calls.length).toBeGreaterThan(fetchesBefore))
  })

  it('equips an unlocked character and refreshes the profile', async () => {
    vi.mocked(studentApi.getGamification).mockResolvedValue(gamification(10))
    vi.mocked(studentApi.updateCharacter).mockResolvedValue({ selected_character: 'kira', message: 'ok' })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /^Kira/ }))
    const fetchesBefore = vi.mocked(studentApi.getStudentProfile).mock.calls.length
    fireEvent.click(await screen.findByRole('button', { name: 'Choose Kira' }))
    await waitFor(() => expect(studentApi.updateCharacter).toHaveBeenCalledWith('kira'))
    await waitFor(() => expect(vi.mocked(studentApi.getStudentProfile).mock.calls.length).toBeGreaterThan(fetchesBefore))
  })
})
