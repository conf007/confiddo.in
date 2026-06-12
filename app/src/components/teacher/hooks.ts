/** TanStack Query keys for the teacher workspace. */
export const teacherKeys = {
  classes: ['teacher', 'classes'] as const,
  dashboard: ['teacher', 'dashboard'] as const,
  pendingAssignments: ['teacher', 'assignments', 'pending'] as const,
  myTests: ['teacher', 'my-tests'] as const,
  classOverview: (classId: string) => ['teacher', 'class', classId, 'overview'] as const,
  studentGroups: (classId: string) => ['teacher', 'class', classId, 'groups'] as const,
  suggestions: (classId: string, testId?: string) =>
    ['teacher', 'class', classId, 'suggestions', testId ?? 'all'] as const,
  explanation: (suggestionId: string) =>
    ['teacher', 'explanation', suggestionId] as const,
  attemptStatus: (testId: string) => ['teacher', 'test', testId, 'attempts'] as const,
  testPaper: (testId: string) => ['teacher', 'test', testId, 'paper'] as const,
  draftReview: (testId: string) => ['teacher', 'draft', testId, 'review'] as const,
  bankChapters: (classId?: string) =>
    ['teacher', 'bank-chapters', classId ?? 'any'] as const,
  studentTrend: (studentId: string) => ['teacher', 'student', studentId, 'trend'] as const,
  studentNotes: (studentId: string) => ['teacher', 'student', studentId, 'notes'] as const,
  studentFlags: (studentId: string) => ['teacher', 'student', studentId, 'flags'] as const,
  interventions: (studentId: string) =>
    ['teacher', 'student', studentId, 'interventions'] as const,
  studentSubjects: (studentId: string) =>
    ['teacher', 'student', studentId, 'subjects'] as const,
  weeklySummary: (classId: string) => ['teacher', 'class', classId, 'summary'] as const,
  readinessDistribution: (classId: string) =>
    ['teacher', 'class', classId, 'distribution'] as const,
  scoreAnalytics: (classId: string) =>
    ['teacher', 'class', classId, 'score-analytics'] as const,
  comparison: ['teacher', 'comparison'] as const,
  selfAnalytics: ['teacher', 'self-analytics'] as const,
  notificationPrefs: ['teacher', 'notification-prefs'] as const,
}
