/**
 * Shared student data hooks (TanStack Query). Query keys are namespaced
 * ['student', ...] so the test-completion flow can invalidate them all.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getGamification,
  getStudentProfile,
  getStudentTests,
} from '../../lib/api/student'

export const studentKeys = {
  all: ['student'] as const,
  tests: ['student', 'tests'] as const,
  gamification: ['student', 'gamification'] as const,
  profile: ['student', 'profile'] as const,
  results: (testId: string) => ['student', 'results', testId] as const,
  rankings: ['student', 'class-rankings'] as const,
}

export function useGamificationQuery() {
  return useQuery({
    queryKey: studentKeys.gamification,
    queryFn: getGamification,
    staleTime: 60_000,
  })
}

export function useStudentProfileQuery() {
  return useQuery({
    queryKey: studentKeys.profile,
    queryFn: getStudentProfile,
    staleTime: 60_000,
  })
}

export function useStudentTestsQuery() {
  return useQuery({
    queryKey: studentKeys.tests,
    queryFn: getStudentTests,
  })
}

/** Invalidate everything XP/test-status related after completing a session. */
export function useInvalidateStudentData() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: studentKeys.all })
  }
}
