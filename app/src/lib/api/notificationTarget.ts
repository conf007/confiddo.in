import type { Role } from '../auth/tokens'
import type { AppNotification } from './notifications'

export function notificationTarget(role: Role | null, n: AppNotification): string | null {
  const ref = n.reference_id
  if (!ref) return null
  const extra = (n.extra_data ?? {}) as Record<string, unknown>
  switch (n.reference_type) {
    case 'test':
      if (role === 'student') return `/student/tests/${ref}/start`
      if (role === 'teacher') {
        if (n.notification_type === 'review_pending') {
          const classId = typeof extra.class_id === 'string' ? extra.class_id : null
          return classId ? `/teacher/classes/${classId}/review?test_id=${ref}` : '/teacher'
        }
        return `/teacher/tests/${ref}`
      }
      return null
    case 'class':
      if (role === 'teacher') return n.notification_type === 'new_class_request' ? '/teacher' : `/teacher/classes/${ref}`
      if (role === 'principal') return `/principal/classes/${ref}`
      return null
    case 'student':
      if (role === 'teacher') return `/teacher/students/${ref}`
      if (role === 'principal') return `/principal/students/${ref}`
      if (role === 'parent') return `/parent/children/${ref}`
      return null
    case 'analysis':
      if (role === 'parent') return `/parent/children/${ref}`
      if (role === 'teacher') return `/teacher/analytics?classId=${ref}`
      return null
    default:
      return null
  }
}
