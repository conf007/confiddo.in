/**
 * School dashboard: whole-school readiness distribution, quick stats and
 * governance summary. Aggregate counts only — never student names (§6.3).
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Icon, type IconName } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { DistributionBars } from '../../components/teacher/DistributionBars'
import { principalKeys } from '../../components/principal/hooks'
import { getPrincipalDashboard, type ReadinessCounts } from '../../lib/api/principal'
import { readinessDisplayName } from '../../lib/parity'

const LEVEL_ORDER: (keyof ReadinessCounts)[] = [
  'avoidant',
  'attempting',
  'practicing',
  'confident',
  'competition_ready',
]

function toDistribution(counts: ReadinessCounts) {
  return LEVEL_ORDER.map((level) => ({
    level,
    level_display: readinessDisplayName(level),
    count: counts[level],
  }))
}

export function PrincipalDashboardPage() {
  const q = useQuery({
    queryKey: principalKeys.dashboard,
    queryFn: getPrincipalDashboard,
  })
  if (q.isPending) return <LoadingState />
  if (q.isError)
    return <ErrorState title="Couldn't load the dashboard" error={q.error} onRetry={() => q.refetch()} />
  const d = q.data
  const r = d.readiness_summary

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{d.school.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            School code {d.school.code} · {r.period}
          </p>
        </div>
        <Badge tone={r.overall_health === 'strong' ? 'success' : 'gold'}>
          {r.overall_health === 'strong' ? 'Strong overall' : 'Mixed picture'}
        </Badge>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon="school" label="Classes" value={d.school.total_classes} />
        <Stat icon="users" label="Teachers" value={d.school.total_teachers} />
        <Stat icon="backpack" label="Students" value={d.school.total_students} />
        <Stat icon="chart" label="Assessed this period" value={r.total_assessed} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink">School-wide readiness</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Counts of students per readiness band — aggregates only.
          </p>
          <div className="mt-4">
            <DistributionBars distribution={toDistribution(r.distribution)} />
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="text-base font-semibold text-ink">Needs a look</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-ink-soft">
              <QuickRow
                to="/principal/heatmap"
                label="Classes needing attention"
                value={r.quick_stats.classes_needing_attention}
                tone={r.quick_stats.classes_needing_attention > 0 ? 'warn' : 'ok'}
              />
              <QuickRow
                to="/principal/heatmap"
                label="Classes doing well"
                value={r.quick_stats.classes_doing_well}
                tone="ok"
              />
              <QuickRow
                to="/principal/directory"
                label="Pending teacher approvals"
                value={r.quick_stats.pending_teacher_approvals}
                tone={r.quick_stats.pending_teacher_approvals > 0 ? 'warn' : 'ok'}
              />
            </ul>
          </Card>
          <Card className="p-6">
            <h2 className="text-base font-semibold text-ink">Governance</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-ink-soft">
              <li className="flex justify-between">
                <span>Active teachers</span>
                <span className="font-semibold text-ink">{d.governance_summary.active_teachers}</span>
              </li>
              <li className="flex justify-between">
                <span>Inactive teachers</span>
                <span className="font-semibold text-ink">{d.governance_summary.inactive_teachers}</span>
              </li>
              <li className="flex justify-between">
                <span>Pending approvals</span>
                <span className="font-semibold text-ink">{d.governance_summary.pending_approvals}</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: IconName; label: string; value: number }) {
  return (
    <Card className="flex items-center gap-3 p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-xl font-bold text-ink">{value}</span>
        <span className="block text-xs font-medium text-ink-muted">{label}</span>
      </span>
    </Card>
  )
}

function QuickRow({
  to,
  label,
  value,
  tone,
}: {
  to: string
  label: string
  value: number
  tone: 'warn' | 'ok'
}) {
  return (
    <li>
      <Link to={to} className="flex items-center justify-between gap-2 hover:text-primary">
        <span>{label}</span>
        <Badge tone={tone === 'warn' && value > 0 ? 'accent' : 'success'}>{value}</Badge>
      </Link>
    </li>
  )
}
