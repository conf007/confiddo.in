import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import * as principalApi from '../../../lib/api/principal'
import { TeacherInsightsPage } from '../TeacherInsightsPage'
import { HeatmapPage } from '../HeatmapPage'
import directorySource from '../DirectoryPage.tsx?raw'
import classesSource from '../ClassesPage.tsx?raw'

vi.mock('../../../lib/api/principal', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/api/principal')>()
  return { ...actual, getTeacherInsights: vi.fn(), getHeatmap: vi.fn() }
})

function renderAt(path: string, node: React.ReactNode, routePath = path) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={routePath} element={node} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Principal phase 4', () => {
  it('teacher insights page renders the review analytics (PR-20)', async () => {
    vi.mocked(principalApi.getTeacherInsights).mockResolvedValue({
      teacher_name: 'Chanchal Jain', total_reviews: 6, total_students_reviewed: 40, avg_time_per_student_ms: 90000,
      decision_breakdown: { agree_pct: 70, same_pct: 20, adjust_pct: 10, total_decisions: 40 }, ai_alignment_pct: 82.4,
      weekly_stats: [{ week: '2026-W36', students: 20, time_ms: 600000 }],
    })
    renderAt('/principal/directory/t1/insights', <TeacherInsightsPage />, '/principal/directory/:teacherId/insights')
    const page = await screen.findByTestId('teacher-insights')
    expect(page).toHaveTextContent('Review insights · Chanchal Jain')
    expect(page).toHaveTextContent('40')
    expect(page).toHaveTextContent('82%')
    expect(page).toHaveTextContent('2026-W36')
  })

  it('heatmap cells link to the class detail with the subject of the cell (PR-05)', async () => {
    vi.mocked(principalApi.getHeatmap).mockResolvedValue({
      period: 'last 4 weeks',
      classes: ['8-A'],
      subjects: ['Mathematics', 'Science'],
      cells: [{ class: '8-A', class_id: 'c1', subject: 'Science', status: 'green', teacher_name: 'T' }],
      legend: { green: { color: '#0a0', label: 'On track' } },
    })
    renderAt('/principal/heatmap', <HeatmapPage />)
    const link = await screen.findByTitle(/8-A · Science/)
    expect(link).toHaveAttribute('href', '/principal/classes/c1?subject=Science')
  })

  it('invite copy and remaining time are in minutes (PR-17, PR-18)', () => {
    expect(directorySource).toContain('valid for 15 minutes')
    expect(directorySource).toContain('min left')
    expect(directorySource).not.toContain('7-day expiry')
  })

  it('class detail reads the subject query and assignment offers primary/co-teacher (PR-07, PR-09)', () => {
    expect(classesSource).toContain("params.get('subject')")
    expect(classesSource).toContain('getClassReadinessDetail(classId, subject)')
    expect(classesSource).toContain('Co-teacher')
  })
})
