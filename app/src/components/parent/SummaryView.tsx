/**
 * Renders one weekly narrative summary (ChildSummary) — used by the child
 * overview "This week" tab and the past-summary detail page. Narrative
 * cards only: headline, story, trend words, support suggestion, growth
 * card. No scores anywhere (ARCHITECTURE.md §6.3).
 */
import type { ChildSummary } from '../../lib/api/parent'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { GrowthCardView } from './GrowthCardView'

const TREND_TONES: Record<string, 'success' | 'primary' | 'neutral'> = {
  improved: 'success',
  stable: 'primary',
  developing: 'neutral',
}

export function SummaryView({ summary }: { summary: ChildSummary }) {
  return (
    <div className="space-y-6">
      <Card>
        <p className="text-xs font-medium text-ink-muted">{summary.period_display}</p>
        <h2 className="mt-2 text-xl font-bold text-ink">{summary.headline}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{summary.narrative}</p>

        {summary.trends.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {summary.trends.map((t, i) => (
              <Badge key={i} tone={TREND_TONES[t.status?.toLowerCase()] ?? 'neutral'}>
                {t.area}
                {t.status ? ` · ${t.status}` : ''}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {summary.support_suggestion && (
        <Card>
          <h3 className="text-sm font-semibold text-ink">How you can help this week</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {summary.support_suggestion}
          </p>
        </Card>
      )}

      {summary.growth_card && <GrowthCardView card={summary.growth_card} />}

      {summary.what_this_means && (
        <p className="text-xs leading-relaxed text-ink-muted">{summary.what_this_means}</p>
      )}
    </div>
  )
}
