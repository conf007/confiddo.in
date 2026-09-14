import { useQuery } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/icons'
import { Spinner } from '../../components/ui/Spinner'
import { CharacterAvatar } from '../../components/student/CharacterAvatar'
import { GalaxyMap } from '../../components/student/GalaxyMap'
import { xpToNextRank } from '../../components/student/galaxy'
import { studentKeys } from '../../components/student/hooks'
import { getClassRankings } from '../../lib/api/student'
import { friendlyError } from '../../lib/api/errors'
import { ShareActions } from '../../components/parent/ShareActions'

function StatChip({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-surface px-2 py-3 text-center">
      <span className="text-sm" aria-hidden="true">{icon}</span>
      <span className="text-sm font-extrabold text-ink">{value}</span>
      <span className="text-[10px] font-medium text-ink-muted">{label}</span>
    </div>
  )
}

export function ClassProgressPage() {
  const rankings = useQuery({ queryKey: studentKeys.rankings, queryFn: getClassRankings })

  if (rankings.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }
  const data = rankings.data
  if (!data) {
    return (
      <EmptyState
        icon="users"
        title="Couldn't load your class"
        description={friendlyError(rankings.error)}
        action={
          <Button variant="secondary" onClick={() => rankings.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }

  const toRankUp = xpToNextRank(data.rankings)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Class progress</h1>
        <p className="mt-1 text-sm text-ink-muted">XP from effort and practice, not marks.</p>
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-tint text-xl" aria-hidden="true">🌌</span>
          <h2 className="text-base font-semibold text-ink">Class Galaxy Map</h2>
          <Badge tone="primary" className="ml-auto">
            {data.total_students} students
          </Badge>
        </div>
        <GalaxyMap entries={data.rankings} />
        <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs font-medium text-ink-muted">
          <span>👑 Rank 1</span>
          <span>⭐ You</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#90CAF9]" /> Classmates
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatChip icon="👥" value={String(data.total_students)} label="students" />
          <StatChip icon="🚀" value={`#${data.user_rank}`} label="your rank" />
          <StatChip icon="⚡" value={data.user_rank === 1 ? 'Top!' : `+${toRankUp} XP`} label="to rank up" />
        </div>
        <ShareActions
          className="mt-4 justify-center"
          text={`🌌 I'm ${data.user_rank === 1 ? 'the Class Topper 🏆' : `Galaxy Rank #${data.user_rank}`} of ${data.total_students} in my class galaxy on Confiddo!`}
        />
      </Card>

      <Card padded={false} className="divide-y divide-slate-100">
        {data.rankings.map((entry) => (
          <div
            key={entry.student_id}
            className={['flex items-center gap-3 px-4 py-3 sm:px-6', entry.is_current_user ? 'bg-primary-tint/60' : ''].join(' ')}
          >
            <span className="w-8 shrink-0 text-center text-sm font-semibold text-ink-muted">
              {entry.rank === 1 ? '👑' : entry.rank}
            </span>
            <CharacterAvatar characterId={entry.character} sizeClassName="h-10 w-10" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {entry.name}
                {entry.is_current_user && <span className="ml-1.5 text-xs font-semibold text-primary">(you)</span>}
              </p>
              {entry.current_streak > 0 && (
                <p className="flex items-center gap-1 text-xs text-ink-muted">
                  <Icon name="flame" className="h-3 w-3 text-accent" />
                  {entry.current_streak}-day streak
                </p>
              )}
            </div>
            <span className="shrink-0 text-sm font-semibold text-accent">{entry.total_points.toLocaleString()} XP</span>
          </div>
        ))}
      </Card>
    </div>
  )
}
