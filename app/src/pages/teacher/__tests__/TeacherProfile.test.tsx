import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as teacherApi from '../../../lib/api/teacher'
import { TeacherProfilePage } from '../ProfilePage'
import { renderRoutes } from './helpers'

vi.mock('../../../lib/api/teacher', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/api/teacher')>()
  return {
    ...actual,
    getTeacherProfile: vi.fn(),
    sendTeacherEmailChangeOtp: vi.fn(),
    verifyTeacherEmailChange: vi.fn(),
  }
})
const logout = vi.fn()
vi.mock('../../../lib/auth/AuthContext', () => ({
  useAuth: () => ({ logout, role: 'teacher', user: { id: 't1', username: 'meera', full_name: 'Meera Iyer' } }),
}))

describe('TeacherProfilePage', () => {
  beforeEach(() => {
    vi.mocked(teacherApi.getTeacherProfile).mockResolvedValue({
      id: 't1', full_name: 'Meera Iyer', email: 'meera@old.example', email_verified: false,
      subject: 'Mathematics', school_name: 'Sunrise Public School',
    })
    vi.mocked(teacherApi.sendTeacherEmailChangeOtp).mockReset()
    vi.mocked(teacherApi.sendTeacherEmailChangeOtp).mockResolvedValue({ message: 'sent' })
    logout.mockReset()
  })

  it('shows the profile and starts an email change through the teacher endpoints', async () => {
    renderRoutes([
      { path: '/teacher/profile', element: <TeacherProfilePage /> },
      { path: '/login', element: <div>login</div> },
    ], '/teacher/profile')
    expect(await screen.findByText('Meera Iyer')).toBeInTheDocument()
    expect(screen.getByText('meera')).toBeInTheDocument()
    expect(screen.getByText('Sunrise Public School')).toBeInTheDocument()
    expect(screen.getByText('meera@old.example')).toBeInTheDocument()
    expect(screen.getByText('Not verified')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'About Confiddo' })).toHaveAttribute('href', '/about')
    expect(screen.getByRole('link', { name: 'Notification settings' })).toHaveAttribute('href', '/teacher/settings')

    fireEvent.click(screen.getByRole('button', { name: 'Change email' }))
    fireEvent.change(screen.getByLabelText('New email address'), { target: { value: 'meera@new.example' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }))
    await waitFor(() => expect(teacherApi.sendTeacherEmailChangeOtp).toHaveBeenCalledWith('meera@new.example'))
    expect(await screen.findByLabelText('Verification code')).toBeInTheDocument()
  })

  it('signs out from the profile page', async () => {
    const router = renderRoutes([
      { path: '/teacher/profile', element: <TeacherProfilePage /> },
      { path: '/login', element: <div>login</div> },
    ], '/teacher/profile')
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(logout).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })
})
