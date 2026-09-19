import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as teacherApi from '../../../lib/api/teacher'
import { ClassListPage } from '../ClassListPage'
import { renderRoutes } from './helpers'

vi.mock('../../../lib/api/teacher', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/api/teacher')>()
  return {
    ...actual,
    getTeacherClasses: vi.fn(),
    getTeacherDashboard: vi.fn(),
    getPendingAssignments: vi.fn(),
    acceptAssignment: vi.fn(),
    rejectAssignment: vi.fn(),
  }
})

describe('ClassListPage assignment decline', () => {
  beforeEach(() => {
    vi.mocked(teacherApi.getTeacherClasses).mockResolvedValue({ classes: [] })
    vi.mocked(teacherApi.getTeacherDashboard).mockResolvedValue({
      continue_tasks: [], pending_tasks: [], recent_activities: [],
    })
    vi.mocked(teacherApi.getPendingAssignments).mockResolvedValue({
      pending_count: 1,
      assignments: [{
        id: 'as1', class_id: 'c1', class_name: 'Class 8A', grade: '8', subject: 'Mathematics',
        is_primary: true, assigned_at: '2026-09-10T00:00:00Z',
      }],
    })
    vi.mocked(teacherApi.rejectAssignment).mockReset()
    vi.mocked(teacherApi.rejectAssignment).mockResolvedValue({
      message: 'ok', class_id: 'c1', class_name: 'Class 8A', status: 'rejected',
    })
  })

  it('asks for a reason and sends it with the rejection', async () => {
    renderRoutes([{ path: '/teacher', element: <ClassListPage /> }], '/teacher')
    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }))
    const submit = screen.getByRole('button', { name: 'Decline class' })
    expect(submit).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Reason for declining'), { target: { value: '  timetable clash ' } })
    expect(submit).toBeEnabled()
    fireEvent.click(submit)
    await waitFor(() => expect(teacherApi.rejectAssignment).toHaveBeenCalledWith('as1', 'timetable clash'))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Decline class' })).not.toBeInTheDocument())
  })
})
