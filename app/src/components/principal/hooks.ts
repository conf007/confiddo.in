/** TanStack Query keys for the principal workspace. */
export const principalKeys = {
  dashboard: ['principal', 'dashboard'] as const,
  heatmap: ['principal', 'heatmap'] as const,
  readinessOverview: ['principal', 'readiness-overview'] as const,
  classReadiness: (classId: string) =>
    ['principal', 'class', classId, 'readiness'] as const,
  classMetrics: (classId: string) => ['principal', 'class', classId, 'metrics'] as const,
  classes: ['principal', 'classes'] as const,
  teachers: ['principal', 'teachers'] as const,
  teacherDetail: (teacherId: string) => ['principal', 'teacher', teacherId] as const,
  teacherInsights: (teacherId: string) =>
    ['principal', 'teacher', teacherId, 'insights'] as const,
  inviteCodes: ['principal', 'invite-codes'] as const,
  students: (search: string, page: number) =>
    ['principal', 'students', search, page] as const,
  studentProgress: (studentId: string) =>
    ['principal', 'student', studentId, 'progress'] as const,
  studentJourney: (studentId: string) =>
    ['principal', 'student', studentId, 'journey'] as const,
  studentSubjects: (studentId: string) =>
    ['principal', 'student', studentId, 'subjects'] as const,
  studentMetrics: (studentId: string) =>
    ['principal', 'student', studentId, 'metrics'] as const,
  schoolMetrics: ['principal', 'school-metrics'] as const,
  profile: ['principal', 'profile'] as const,
}
