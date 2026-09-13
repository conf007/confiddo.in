import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as studentApi from '../../lib/api/student'
import { UserMenu } from '../UserMenu'
import { DeviceSwitchBadge } from '../teacher/DeviceSwitchBadge'

const auth = vi.hoisted(() => ({ role: 'student' as string, user: { full_name: 'Asha Rao' } as Record<string, unknown> }))
vi.mock('../../lib/auth/AuthContext', () => ({
  useAuth: () => ({ logout: vi.fn(), role: auth.role, user: auth.user }),
}))
vi.mock('../../lib/api/student', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/student')>()
  return { ...actual, getStudentProfile: vi.fn() }
})

function renderMenu() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('UserMenu', () => {
  beforeEach(() => {
    vi.mocked(studentApi.getStudentProfile).mockReset()
    vi.mocked(studentApi.getStudentProfile).mockResolvedValue({
      id: 'st1', username: 'asha', full_name: 'Asha Rao', class_grade: '8', section: 'A', selected_character: 'onyx',
      email_verified: false, parent_has_logged_in: true,
    })
  })

  it('shows the equipped character for a student', async () => {
    auth.role = 'student'
    renderMenu()
    expect(await screen.findByTestId('header-character')).toHaveAttribute('data-character', 'onyx')
  })

  it('keeps initials for other roles and never fetches the student profile', () => {
    auth.role = 'teacher'
    renderMenu()
    expect(screen.getByText('AR')).toBeInTheDocument()
    expect(studentApi.getStudentProfile).not.toHaveBeenCalled()
  })
})

describe('DeviceSwitchBadge', () => {
  it('flags two or more device switches, neutrally', () => {
    const { rerender } = render(<DeviceSwitchBadge count={1} />)
    expect(screen.queryByText('Multiple device switches')).not.toBeInTheDocument()
    rerender(<DeviceSwitchBadge count={2} />)
    expect(screen.getByText('Multiple device switches')).toBeInTheDocument()
  })
})
