/** TanStack Query keys + shared hooks for the parent workspace. */
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { deviceHeartbeat, getChildren } from '../../lib/api/parent'

export const parentKeys = {
  children: ['parent', 'children'] as const,
  devices: ['parent', 'devices'] as const,
  profile: ['parent', 'profile'] as const,
  examGuide: (category?: string) => ['parent', 'exam-guide', category ?? 'all'] as const,
  summary: (childId: string) => ['parent', 'child', childId, 'summary'] as const,
  summaries: (childId: string) => ['parent', 'child', childId, 'summaries'] as const,
  summaryDetail: (summaryId: string) => ['parent', 'summary', summaryId] as const,
  subjectSummary: (childId: string) => ['parent', 'child', childId, 'subjects'] as const,
  fourWeekPaged: (childId: string, page: number) =>
    ['parent', 'child', childId, 'four-week', page] as const,
  fullJourney: (childId: string) => ['parent', 'child', childId, 'journey'] as const,
  topicMovement: (childId: string) => ['parent', 'child', childId, 'topic-movement'] as const,
  activityFeed: (childId: string, subject?: string) =>
    ['parent', 'child', childId, 'activity', subject ?? 'all'] as const,
  engagement: (childId: string) => ['parent', 'child', childId, 'engagement'] as const,
  starters: (childId: string) => ['parent', 'child', childId, 'starters'] as const,
  insights: (childId: string) => ['parent', 'child', childId, 'insights'] as const,
  goals: (childId: string) => ['parent', 'child', childId, 'goals'] as const,
  monthlyReport: (childId: string, month: number, year: number) =>
    ['parent', 'child', childId, 'monthly-report', year, month] as const,
  achievements: (childId: string) => ['parent', 'child', childId, 'achievements'] as const,
  performanceCard: (childId: string) =>
    ['parent', 'child', childId, 'performance-card'] as const,
  readiness: (childId: string) => ['parent', 'child', childId, 'readiness'] as const,
  classRanking: (childId: string) => ['parent', 'child', childId, 'class-ranking'] as const,
}

export function useChildrenQuery() {
  return useQuery({ queryKey: parentKeys.children, queryFn: getChildren })
}

const HEARTBEAT_MS = 5 * 60 * 1000

/**
 * Parent device heartbeat — POST /parent/devices/heartbeat every 5 minutes
 * while the parent workspace is open (backend/app/api/parent.py:210-227,
 * keeps ParentSession.last_active_at fresh so the session isn't culled as
 * stale). Mounted once in ParentRoot, not in the shared layout.
 */
export function useDeviceHeartbeat() {
  useEffect(() => {
    let cancelled = false
    const beat = () => {
      if (cancelled || document.visibilityState === 'hidden') return
      deviceHeartbeat().catch(() => {
        /* best-effort — never surface heartbeat errors to the parent */
      })
    }
    beat()
    const id = window.setInterval(beat, HEARTBEAT_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])
}
