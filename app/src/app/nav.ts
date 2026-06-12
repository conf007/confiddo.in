/**
 * Role → home route, nav items and dashboard section map.
 * Routes follow ARCHITECTURE.md §6.2 (screen inventory → planned web routes).
 */
import type { Role } from '../lib/auth/tokens'
import type { IconName } from '../components/icons'

export function roleHome(role: Role | null): string {
  switch (role) {
    case 'student':
      return '/student'
    case 'teacher':
      return '/teacher'
    case 'parent':
      return '/parent'
    case 'principal':
      return '/principal'
    default:
      return '/login'
  }
}

export interface NavItem {
  to: string
  label: string
  icon: IconName
  end?: boolean
}

/** Student: horizontal tabs (desktop) / bottom bar (mobile). */
export const STUDENT_TABS: NavItem[] = [
  { to: '/student', label: 'Home', icon: 'home', end: true },
  { to: '/student/progress', label: 'Progress', icon: 'chart' },
  { to: '/student/badges', label: 'Badges', icon: 'medal' },
  { to: '/student/characters', label: 'Characters', icon: 'sparkles' },
  { to: '/student/class-progress', label: 'Class', icon: 'users' },
]

export const TEACHER_NAV: NavItem[] = [
  { to: '/teacher', label: 'My Classes', icon: 'users', end: true },
  { to: '/teacher/tests', label: 'Tests', icon: 'clipboard' },
  { to: '/teacher/paper/new', label: 'Paper Builder', icon: 'book' },
  { to: '/teacher/analytics', label: 'Analytics', icon: 'chart-line' },
  { to: '/teacher/settings', label: 'Settings', icon: 'settings' },
]

export const PARENT_NAV: NavItem[] = [
  { to: '/parent', label: 'My Children', icon: 'users', end: true },
  { to: '/parent/link-child', label: 'Link a Child', icon: 'link' },
  { to: '/parent/exam-guide', label: 'Exam Guide', icon: 'book' },
  { to: '/parent/devices', label: 'Devices', icon: 'device' },
  { to: '/parent/profile', label: 'Profile', icon: 'user' },
]

export const PRINCIPAL_NAV: NavItem[] = [
  { to: '/principal', label: 'Dashboard', icon: 'home', end: true },
  { to: '/principal/heatmap', label: 'Heatmap', icon: 'grid' },
  { to: '/principal/classes', label: 'Classes', icon: 'school' },
  { to: '/principal/directory', label: 'Directory', icon: 'users' },
  { to: '/principal/students', label: 'Students', icon: 'search' },
  { to: '/principal/profile', label: 'Profile', icon: 'user' },
]

export interface SectionInfo {
  label: string
  description: string
  icon: IconName
}

/** "Sections coming online" grid for the placeholder dashboards. */
export const ROLE_SECTIONS: Record<
  Exclude<Role, 'admin'>,
  SectionInfo[]
> = {
  student: [
    { label: 'Practice Tests', description: 'Tests by subject, resume where you left off', icon: 'clipboard' },
    { label: 'My Progress', description: 'XP, weekly journey and streaks', icon: 'chart' },
    { label: 'Badges', description: 'Achievements you have earned', icon: 'medal' },
    { label: 'Characters', description: 'Collect and equip your crew', icon: 'sparkles' },
    { label: 'Class Progress', description: 'Your readiness, your pace', icon: 'users' },
    { label: 'Link a Parent', description: 'Share your journey at home', icon: 'link' },
  ],
  teacher: [
    { label: 'My Classes', description: 'Class overviews and student lists', icon: 'users' },
    { label: 'Tests', description: 'Status, content and deadlines', icon: 'clipboard' },
    { label: 'Paper Builder', description: 'Config → prompt → preview, 3 steps', icon: 'book' },
    { label: 'Review & Validate', description: 'Readiness suggestions, bulk validation', icon: 'check' },
    { label: 'Analytics', description: 'Weekly summary, class comparison', icon: 'chart-line' },
    { label: 'Parent Messages', description: 'Reach out to families', icon: 'message' },
  ],
  parent: [
    { label: 'My Children', description: 'Weekly effort summaries', icon: 'users' },
    { label: 'Growth Cards', description: 'Celebrate small wins', icon: 'medal' },
    { label: 'Home Goals', description: 'Gentle goals for the week', icon: 'check' },
    { label: 'Conversation Starters', description: 'Talk about learning, not marks', icon: 'message' },
    { label: 'Devices', description: 'Manage your two signed-in devices', icon: 'device' },
    { label: 'Link a Child', description: 'Use the 6-character code from your child', icon: 'link' },
  ],
  principal: [
    { label: 'School Dashboard', description: 'Whole-school readiness at a glance', icon: 'home' },
    { label: 'Readiness Heatmap', description: 'Classes × readiness bands', icon: 'grid' },
    { label: 'Classes', description: 'Aggregate class detail', icon: 'school' },
    { label: 'Teacher Directory', description: 'Approvals and invite codes', icon: 'users' },
    { label: 'Student Search', description: 'Find a student journey', icon: 'search' },
    { label: 'Analytics', description: 'Trends across the term', icon: 'chart-line' },
  ],
}

export const ROLE_LABELS: Record<Role, string> = {
  student: 'Student',
  teacher: 'Teacher',
  parent: 'Parent',
  principal: 'School Leader',
  admin: 'Admin',
}
