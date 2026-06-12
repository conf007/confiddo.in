/**
 * /student/characters — 18-character collection grid (parity catalog).
 *
 * - Locked: single muted gray treatment, lock overlay, XP needed, neutral
 *   gray progress bar (CLAUDE.md §3 locked state).
 * - Unlocked: tinted avatar + soft glow, XP in accent.
 * - Select: PUT /student/character (query param). The CLIENT enforces the XP
 *   gate — the server only validates the ID (ARCHITECTURE.md §9.5).
 */
import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/icons'
import { Spinner } from '../../components/ui/Spinner'
import { CharacterAvatar } from '../../components/student/CharacterAvatar'
import { ProgressBar } from '../../components/student/ProgressBar'
import { Sheet } from '../../components/student/Sheet'
import {
  CHARACTER_FLAVOR,
  RARITY_LABELS,
} from '../../components/student/characterFlavor'
import {
  studentKeys,
  useGamificationQuery,
  useStudentProfileQuery,
} from '../../components/student/hooks'
import { friendlyError } from '../../lib/api/errors'
import { updateCharacter } from '../../lib/api/student'
import { CHARACTERS, type CharacterInfo, type CharacterRarity } from '../../lib/parity'

const RARITY_ORDER: CharacterRarity[] = ['starter', 'rare', 'epic', 'legendary']

const RARITY_TAGLINES: Record<CharacterRarity, string> = {
  starter: 'Yours from day one',
  rare: 'Earned with steady practice',
  epic: 'For dedicated learners',
  legendary: 'The stuff of legends',
}

export function CharactersPage() {
  const gamification = useGamificationQuery()
  const profile = useStudentProfileQuery()
  const qc = useQueryClient()
  const [detail, setDetail] = useState<CharacterInfo | null>(null)
  const [selectError, setSelectError] = useState<string | null>(null)

  const totalXp = gamification.data?.total_points ?? 0
  const selectedId = profile.data?.selected_character

  const select = useMutation({
    mutationFn: (characterId: string) => updateCharacter(characterId),
    onSuccess: () => {
      setSelectError(null)
      setDetail(null)
      void qc.invalidateQueries({ queryKey: studentKeys.profile })
    },
    onError: (e) => setSelectError(friendlyError(e)),
  })

  const sections = useMemo(
    () =>
      RARITY_ORDER.map((rarity) => ({
        rarity,
        characters: CHARACTERS.filter((c) => c.rarity === rarity),
      })),
    [],
  )

  if (gamification.isLoading || profile.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  const unlockedCount = CHARACTERS.filter((c) => totalXp >= c.requiredXp).length

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Your crew</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Practice earns XP — XP unlocks new characters.
          </p>
        </div>
        <Badge tone="primary">
          {unlockedCount}/{CHARACTERS.length} unlocked
        </Badge>
      </div>

      {sections.map(({ rarity, characters }) => {
        const unlockedHere = characters.filter((c) => totalXp >= c.requiredXp).length
        return (
          <section key={rarity} aria-label={RARITY_LABELS[rarity]}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">
                  {RARITY_LABELS[rarity]}
                </h2>
                <p className="text-xs text-ink-muted">{RARITY_TAGLINES[rarity]}</p>
              </div>
              <Badge tone="neutral">
                {unlockedHere}/{characters.length}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-[3%] gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
              {characters.map((character) => {
                const unlocked = totalXp >= character.requiredXp
                const isSelected = character.id === selectedId
                const flavor = CHARACTER_FLAVOR[character.id]
                return (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() => setDetail(character)}
                    className={[
                      'flex min-h-12 flex-col items-center gap-2 rounded-card bg-card p-[6%] py-4 text-center shadow-soft',
                      'transition-transform duration-150 hover:-translate-y-0.5',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                      isSelected ? 'ring-2 ring-primary' : '',
                    ].join(' ')}
                  >
                    <span className="relative">
                      <CharacterAvatar
                        characterId={character.id}
                        locked={!unlocked}
                        glow={isSelected}
                        sizeClassName="h-16 w-16 text-2xl"
                      />
                      {!unlocked && (
                        <span className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                          <Icon name="lock" className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-sm font-medium ${unlocked ? 'text-ink' : 'text-ink-muted'}`}
                    >
                      {character.name}
                    </span>
                    {unlocked ? (
                      isSelected ? (
                        <Badge tone="primary">Equipped</Badge>
                      ) : (
                        <span className="text-xs font-medium text-accent">Unlocked</span>
                      )
                    ) : (
                      <span className="w-full">
                        <ProgressBar
                          value={character.requiredXp > 0 ? totalXp / character.requiredXp : 1}
                          tone="muted"
                          label={`${character.name} unlock progress`}
                        />
                        <span className="mt-1.5 block text-xs text-ink-muted">
                          {flavor ? `${character.requiredXp.toLocaleString()} XP` : `${character.requiredXp} XP`}
                        </span>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}

      <CharacterDetailSheet
        character={detail}
        totalXp={totalXp}
        selectedId={selectedId}
        onClose={() => {
          setDetail(null)
          setSelectError(null)
        }}
        onSelect={(id) => select.mutate(id)}
        selecting={select.isPending}
        error={selectError}
      />
    </div>
  )
}

function CharacterDetailSheet({
  character,
  totalXp,
  selectedId,
  onClose,
  onSelect,
  selecting,
  error,
}: {
  character: CharacterInfo | null
  totalXp: number
  selectedId?: string | null
  onClose: () => void
  onSelect: (id: string) => void
  selecting: boolean
  error: string | null
}) {
  if (!character) return null
  const unlocked = totalXp >= character.requiredXp
  const isSelected = character.id === selectedId
  const flavor = CHARACTER_FLAVOR[character.id]

  return (
    <Sheet open onClose={onClose} title="">
      <div className="flex flex-col items-center pb-2 text-center">
        <span className="relative mb-4">
          <CharacterAvatar
            characterId={character.id}
            locked={!unlocked}
            glow={unlocked}
            sizeClassName="h-24 w-24 text-4xl"
          />
          {!unlocked && (
            <span className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-500">
              <Icon name="lock" className="h-4 w-4" />
            </span>
          )}
        </span>
        <h2 className="text-2xl font-bold text-ink">{character.name}</h2>
        {flavor && (
          <p className="mt-1 text-sm text-ink-muted italic">{flavor.vibe}</p>
        )}
        <Badge
          tone={character.rarity === 'legendary' && unlocked ? 'gold' : 'neutral'}
          className="mt-3"
        >
          {RARITY_LABELS[character.rarity]}
        </Badge>
        {flavor && (
          <p className="mt-3 line-clamp-2 max-w-xs text-sm leading-relaxed text-ink-soft">
            {flavor.description}
          </p>
        )}
        {flavor && (
          <div className="mt-3 flex gap-2">
            {flavor.tags.map((tag) => (
              <Badge key={tag} tone="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {!unlocked && (
          <Card className="mt-5 w-full border border-slate-100 shadow-none" padded>
            <p className="mb-2 text-xs font-medium tracking-wide text-ink-muted uppercase">
              Unlock progress
            </p>
            <ProgressBar
              value={character.requiredXp > 0 ? totalXp / character.requiredXp : 1}
              tone="muted"
              label={`${character.name} unlock progress`}
            />
            <p className="mt-2 text-center text-xs text-ink-muted">
              {totalXp.toLocaleString()} / {character.requiredXp.toLocaleString()} XP
            </p>
          </Card>
        )}

        {error && (
          <p className="mt-4 text-sm text-band-red" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 w-full">
          {unlocked ? (
            isSelected ? (
              <Button full variant="secondary" disabled>
                <Icon name="check" className="h-4.5 w-4.5" />
                Equipped
              </Button>
            ) : (
              <Button
                full
                onClick={() => onSelect(character.id)}
                loading={selecting}
              >
                Choose {character.name}
              </Button>
            )
          ) : (
            <p className="text-xs text-ink-muted">
              Keep practicing — {Math.max(0, character.requiredXp - totalXp).toLocaleString()}{' '}
              XP to go.
            </p>
          )}
        </div>
      </div>
    </Sheet>
  )
}
