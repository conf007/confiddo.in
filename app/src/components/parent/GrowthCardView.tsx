/**
 * Growth card — the small celebration card attached to a weekly summary
 * (backend/app/services/parent_service.py:144-155). Rendered warm and
 * share-first: the card itself plus copy/WhatsApp actions. Sharing records
 * the event via POST /parent/cards/{id}/share (parent.py:344-363).
 */
import { useMutation } from '@tanstack/react-query'
import { shareGrowthCard, type GrowthCard } from '../../lib/api/parent'
import { Badge } from '../ui/Badge'
import { ShareActions } from './ShareActions'

const CARD_TYPE_LABELS: Record<string, string> = {
  persistence_star: 'Persistence',
  effort: 'Effort',
  consistency: 'Consistency',
  growth: 'Growth',
}

export function GrowthCardView({ card }: { card: GrowthCard }) {
  // Fire-and-forget share logging; the share text we already have locally.
  const recordShare = useMutation({ mutationFn: () => shareGrowthCard(card.id) })

  return (
    <div className="rounded-card bg-accent-tint p-6">
      <div className="flex items-center justify-between gap-3">
        <Badge tone="accent">
          {CARD_TYPE_LABELS[card.card_type] ?? 'Growth moment'}
        </Badge>
        {card.subject && <span className="text-xs text-ink-muted">{card.subject}</span>}
      </div>
      <h3 className="mt-3 text-lg font-bold text-ink">{card.headline}</h3>
      {card.description && (
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{card.description}</p>
      )}
      <ShareActions
        text={card.share_message}
        onShare={() => recordShare.mutate()}
        className="mt-4"
      />
    </div>
  )
}
