import { Badge } from './ui/Badge'
import { Card } from './ui/Card'
import { Icon } from './icons'
import { useAuth } from '../lib/auth/AuthContext'
import { ROLE_SECTIONS } from '../app/nav'
import type { Role } from '../lib/auth/tokens'

export interface DashboardPlaceholderProps {
  role: Exclude<Role, 'admin'>
  tagline: string
}

/**
 * Phase-1 dashboard: welcome card + "sections coming online" grid from the
 * §6.2 route map. Later phases replace this page per role.
 */
export function DashboardPlaceholder({
  role,
  tagline,
}: DashboardPlaceholderProps) {
  const { user } = useAuth()
  const sections = ROLE_SECTIONS[role]
  const firstName = user?.full_name?.trim().split(/\s+/)[0]

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <section className="rounded-card bg-navy p-6 text-white shadow-soft sm:p-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
          Confidence Builds Readiness
        </p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
          Welcome back{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
          {tagline}
        </p>
      </section>

      {/* Sections coming online */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Your workspace</h2>
          <Badge tone="outline">{sections.length} sections</Badge>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => (
            <Card key={s.label} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-tint text-primary">
                  <Icon name={s.icon} className="h-5 w-5" />
                </span>
                <Badge tone="accent">Coming online</Badge>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">{s.label}</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  {s.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
