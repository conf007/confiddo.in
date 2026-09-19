import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as parentApi from '../../../lib/api/parent'
import { AchievementsPage } from '../ChildMorePages'
import { PerformanceCardPage, SubjectDetailPage, SubjectsTab } from '../SubjectPages'
import { ParentProfilePage } from '../ProfilePage'
import subjectPagesSource from '../SubjectPages.tsx?raw'
import overviewSource from '../ChildOverviewPage.tsx?raw'

vi.mock('../../../lib/api/parent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/api/parent')>()
  return {
    ...actual,
    getSubjectSummary: vi.fn(),
    getTopicMovement: vi.fn(),
    getPerformanceCard: vi.fn(),
    getAchievements: vi.fn(),
    getParentProfile: vi.fn(),
    getChildren: vi.fn(),
  }
})
vi.mock('../../../lib/auth/AuthContext', () => ({
  useAuth: () => ({ logout: vi.fn(), role: 'parent', user: null }),
}))

const subject: parentApi.SubjectSummaryEntry = {
  name: 'Mathematics', icon: '🔢', color: '#000', progress_percent: 73, progress_change: 12, session_count: 4,
  worksheets_done: 2, worksheets_total: 3, questions_count: 30, insight: 'Steady effort on fractions.',
  weekly_progress: [{ week: 1, progress: 60, sessions: 2, questions: 20 }, { week: 2, progress: 80, sessions: 2, questions: 10 }],
  topic_breakdown: { confident: ['Fractions'], improving: ['Decimals'], needs_help: [] },
  readiness_group: 'practicing', readiness_level: 'practicing', readiness_level_display: 'Practicing',
  behavioral_observations: [{ text: 'Keeps trying after a wrong answer', status: 'green' }],
}

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

describe('Parent subjects (P-11, P-14, P-31)', () => {
  beforeEach(() => {
    vi.mocked(parentApi.getSubjectSummary).mockResolvedValue({
      child_id: 'c1', child_first_name: 'Asha', period: { start: '2026-09-01', end: '2026-09-14' },
      overall_stats: { total_sessions: 4, overall_progress: 70, streak: 3 }, subjects: [subject],
    })
    vi.mocked(parentApi.getTopicMovement).mockResolvedValue({ movements: { Mathematics: [{ topic: 'Decimals', from_category: 'needs_help', to_category: 'improving' }] } })
  })

  it('shows readiness words, observations and topic movement, never the percentage', async () => {
    renderAt('/p', <SubjectsTab childId="c1" />)
    const tab = await screen.findByTestId('subjects-tab')
    expect(tab).toHaveTextContent('Mathematics')
    expect(tab).toHaveTextContent('Practicing')
    expect(tab).toHaveTextContent('Keeps trying after a wrong answer')
    expect(screen.getByTestId('topic-movement')).toHaveTextContent('Decimals: needs a hand → improving')
    expect(tab.textContent).not.toMatch(/73|%/)
    expect(screen.getByRole('link', { name: 'Details' })).toHaveAttribute('href', '/parent/children/c1/subjects/Mathematics')
  })

  it('subject detail lists topics and weekly sessions, no percentage', async () => {
    renderAt('/parent/children/c1/subjects/Mathematics', <SubjectDetailPage />, '/parent/children/:childId/subjects/:subject')
    const page = await screen.findByTestId('subject-detail')
    expect(page).toHaveTextContent('Fractions')
    expect(page).toHaveTextContent('Week 1')
    expect(page).toHaveTextContent('2 sessions · 20 questions')
    expect(page.textContent).not.toMatch(/\d+%/)
  })
})

describe('Performance card (P-26) and achievements (P-24)', () => {
  it('renders words and effort counts, never the subject score', async () => {
    vi.mocked(parentApi.getPerformanceCard).mockResolvedValue({
      child_name: 'Asha', class_grade: '8', school_name: 'DPS', total_points: 320, current_streak: 3, level_name: 'Super Nova',
      tests_completed: 5, total_tests: 6, subjects_practiced: ['Mathematics'], persistence_level: 'Steady', practice_days_this_month: 9,
      best_subject: 'Mathematics', best_subject_score: 88,
    })
    renderAt('/parent/children/c1/card', <PerformanceCardPage />, '/parent/children/:childId/card')
    const card = await screen.findByTestId('performance-card')
    expect(card).toHaveTextContent('Super Nova')
    expect(card).toHaveTextContent('Best subject: Mathematics')
    expect(card.textContent).not.toMatch(/88|320|%/)
  })

  it('hides rank and XP stats and drops top-ranker cards', async () => {
    vi.mocked(parentApi.getAchievements).mockResolvedValue({
      child_first_name: 'Asha',
      achievements: [
        { type: 'level_up', title: 'Level up', subtitle: 's', message: 'm', emoji: '🚀', stat_label: 'Total XP', stat_value: '320', secondary_stat_label: 'Level', secondary_stat_value: '3', color_hex: '#000' },
        { type: 'top_ranker', title: 'Top of the class', subtitle: 's', message: 'm', emoji: '👑', stat_label: 'Class Rank', stat_value: '#1', secondary_stat_label: 'Out of', secondary_stat_value: '25', color_hex: '#000' },
        { type: 'streak_milestone', title: 'Streak', subtitle: 's', message: 'm', emoji: '🔥', stat_label: 'Current Streak', stat_value: '7 days', secondary_stat_label: 'Best', secondary_stat_value: '9 days', color_hex: '#000' },
      ],
    } as never)
    renderAt('/parent/children/c1/achievements', <AchievementsPage />, '/parent/children/:childId/achievements')
    expect(await screen.findByText('Level up')).toBeInTheDocument()
    expect(screen.queryByText('Top of the class')).not.toBeInTheDocument()
    expect(screen.queryByText('320')).not.toBeInTheDocument()
    expect(screen.getByText('7 days')).toBeInTheDocument()
  })
})

describe('Parent profile (P-32)', () => {
  it('lists linked children with a link-child entry', async () => {
    vi.mocked(parentApi.getParentProfile).mockResolvedValue({ id: 'p1', full_name: 'Rao', email: null, email_verified: false, phone: null } as never)
    vi.mocked(parentApi.getChildren).mockResolvedValue({ children: [{ id: 'c1', first_name: 'Asha', grade: '8', school_name: 'DPS', has_new_summary: false }] })
    renderAt('/parent/profile', <ParentProfilePage />)
    const list = await screen.findByTestId('linked-children')
    expect(list).toHaveTextContent('Asha')
    expect(screen.getByRole('link', { name: /link a child/i })).toHaveAttribute('href', '/parent/link-child')
  })
})

describe('parent golden rule (source scan)', () => {
  it('never renders progress_percent, best_subject_score or levels_gained as a number', () => {
    for (const src of [subjectPagesSource, overviewSource]) {
      expect(src).not.toMatch(/\{s\.progress_percent\}|\{d\.best_subject_score\}|String\(d\.summary_stats\.levels_gained/)
    }
  })
})
