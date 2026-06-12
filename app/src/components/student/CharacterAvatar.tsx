/**
 * Character avatar — initial-letter medallion (no character art exists in the
 * web repo yet; the Flutter app uses tinted shapes too). Unlocked characters
 * get a soft tinted background from the single blue/gold palette; locked is
 * one muted gray treatment everywhere (CLAUDE.md §1/§3).
 */
import { getCharacter } from '../../lib/parity'
import type { CharacterRarity } from '../../lib/parity'

const RARITY_TINTS: Record<CharacterRarity, string> = {
  // One hue family (blue) for starter/rare/epic, gold reserved for legendary
  // reward moments — stays within 3 hue families per screen.
  starter: 'bg-primary-tint text-primary',
  rare: 'bg-primary-tint text-primary',
  epic: 'bg-primary/15 text-primary',
  legendary: 'bg-gold-tint text-amber-700',
}

export interface CharacterAvatarProps {
  characterId?: string | null
  /** Tailwind size classes for the circle, e.g. 'h-12 w-12 text-lg' */
  sizeClassName?: string
  locked?: boolean
  /** soft glow ring for the equipped/unlocked hero treatment */
  glow?: boolean
  className?: string
}

export function CharacterAvatar({
  characterId,
  sizeClassName = 'h-12 w-12 text-lg',
  locked = false,
  glow = false,
  className = '',
}: CharacterAvatarProps) {
  const character = getCharacter(characterId)
  const tint = locked
    ? 'bg-slate-100 text-slate-400'
    : RARITY_TINTS[character.rarity]
  return (
    <span
      aria-hidden="true"
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none',
        sizeClassName,
        tint,
        glow && !locked ? 'ring-4 ring-primary/15 shadow-soft' : '',
        className,
      ].join(' ')}
    >
      {character.name.charAt(0)}
    </span>
  )
}
