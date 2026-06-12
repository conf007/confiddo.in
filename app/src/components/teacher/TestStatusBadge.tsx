/**
 * Test lifecycle badge: draft → live → review → completed
 * (backend/app/models/test.py:29-87, ARCHITECTURE.md §5.2).
 */
import { Badge } from '../ui/Badge'

const LABELS: Record<string, { label: string; tone: 'neutral' | 'primary' | 'accent' | 'success' | 'outline' }> = {
  draft: { label: 'Draft', tone: 'outline' },
  live: { label: 'Live', tone: 'primary' },
  review: { label: 'Needs review', tone: 'accent' },
  completed: { label: 'Completed', tone: 'success' },
}

export function TestStatusBadge({ status }: { status: string }) {
  const s = LABELS[status] ?? { label: status, tone: 'neutral' as const }
  return <Badge tone={s.tone}>{s.label}</Badge>
}
