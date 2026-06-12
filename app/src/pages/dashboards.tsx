import { DashboardPlaceholder } from '../components/DashboardPlaceholder'

export function StudentHomePage() {
  return (
    <DashboardPlaceholder
      role="student"
      tagline="No pressure — just practice at your own pace. Your tests, progress and characters will appear here."
    />
  )
}

export function TeacherHomePage() {
  return (
    <DashboardPlaceholder
      role="teacher"
      tagline="Your classes, tests and readiness reviews are coming online. Everything you validate stays teacher-first."
    />
  )
}

export function ParentHomePage() {
  return (
    <DashboardPlaceholder
      role="parent"
      tagline="See how your child is growing in confidence — effort stories, not scores."
    />
  )
}

export function PrincipalHomePage() {
  return (
    <DashboardPlaceholder
      role="principal"
      tagline="School-wide readiness at a glance: heatmaps, class aggregates and your teacher directory."
    />
  )
}
