import { getCharacter } from '../../lib/parity'
import { CHARACTER_ART } from './characterArt'

export interface CharacterAvatarProps {
  characterId?: string | null
  sizeClassName?: string
  locked?: boolean
  glow?: boolean
  className?: string
  'data-testid'?: string
}

export function CharacterAvatar({
  characterId,
  sizeClassName = 'h-12 w-12 text-lg',
  locked = false,
  glow = false,
  className = '',
  'data-testid': testId,
}: CharacterAvatarProps) {
  const character = getCharacter(characterId)
  const art = CHARACTER_ART[character.id]
  return (
    <span
      aria-hidden="true"
      data-testid={testId}
      data-character={character.id}
      className={[
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full select-none',
        sizeClassName,
        locked ? 'bg-slate-100' : '',
        glow && !locked ? 'ring-4 ring-primary/15 shadow-soft' : '',
        className,
      ].join(' ')}
      style={locked ? undefined : { backgroundColor: art.bg }}
    >
      <svg
        viewBox="0 0 120 120"
        className={locked ? 'h-full w-full opacity-60 grayscale' : 'h-full w-full'}
        dangerouslySetInnerHTML={{ __html: art.svg }}
      />
    </span>
  )
}
