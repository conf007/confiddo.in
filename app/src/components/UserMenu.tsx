import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth/AuthContext'
import { ROLE_LABELS } from '../app/nav'
import { getCharacter } from '../lib/parity'
import { Icon } from './icons'
import { CharacterAvatar } from './student/CharacterAvatar'
import { useStudentProfileQuery } from './student/hooks'

function initials(name: string | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')
  ).toUpperCase()
}

/** Avatar button + dropdown (name, role, sign out). */
export function UserMenu() {
  const { user, role, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const profile = useStudentProfileQuery(role === 'student')
  const characterId = role === 'student' ? profile.data?.selected_character : undefined
  const character = characterId ? getCharacter(characterId) : null

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-12 w-12 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {character ? (
          <CharacterAvatar
            characterId={characterId}
            sizeClassName="h-9 w-9 text-sm"
            data-testid="header-character"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-tint text-sm font-semibold text-primary">
            {initials(user?.full_name)}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-1 w-56 rounded-xl bg-card p-2 shadow-soft border border-slate-100"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-ink">
              {user?.full_name ?? 'Signed in'}
            </p>
            <p className="text-xs text-ink-muted">
              {role ? ROLE_LABELS[role] : ''}
              {user?.username ? ` · @${user.username}` : ''}
            </p>
          </div>
          {character && (
            <Link
              to="/student/characters"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-ink-soft hover:bg-slate-50"
            >
              <CharacterAvatar characterId={characterId} sizeClassName="h-6 w-6 text-xs" />
              Playing as {character.name}
            </Link>
          )}
          <hr className="my-1 border-slate-100" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              logout()
            }}
            className="flex h-11 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-ink-soft hover:bg-slate-50"
          >
            <Icon name="logout" className="h-4.5 w-4.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
