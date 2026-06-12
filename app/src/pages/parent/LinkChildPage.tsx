/**
 * /parent/link-child — link a child using the 6-character code the child
 * generates (24 h validity, single use). POST /parent/link-child
 * (backend/app/api/parent.py:38-116). Backend error codes carry
 * parent-appropriate copy (INVALID_CODE / CODE_ALREADY_USED /
 * CODE_EXPIRED / ALREADY_LINKED) — surfaced verbatim.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/icons'
import { parentKeys } from '../../components/parent/hooks'
import { linkChild } from '../../lib/api/parent'
import { ApiError } from '../../lib/api/client'
import { friendlyError } from '../../lib/api/errors'

const LINK_ERROR_CODES = new Set([
  'INVALID_CODE',
  'CODE_ALREADY_USED',
  'CODE_EXPIRED',
  'ALREADY_LINKED',
])

function linkError(e: unknown): string {
  // The backend's own copy is the right voice here ("ask your child for a
  // new one") — the generic friendlyError mapping is invite-code flavored.
  if (e instanceof ApiError && e.code && LINK_ERROR_CODES.has(e.code)) {
    return e.message
  }
  return friendlyError(e)
}

export function LinkChildPage() {
  const [code, setCode] = useState('')
  const qc = useQueryClient()

  const link = useMutation({
    mutationFn: () => linkChild(code.trim()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: parentKeys.children })
    },
  })

  const linked = link.data

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Link a child</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Ask your child to open their app and generate a parent link code —
          it's 6 characters and valid for 24 hours.
        </p>
      </div>

      {linked ? (
        <Card className="space-y-4 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-tint text-success">
            <Icon name="check" className="h-7 w-7" />
          </span>
          <div>
            <p className="text-base font-semibold text-ink">
              You're now linked to {linked.child.name ?? 'your child'}!
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {linked.child.grade ? `Class ${linked.child.grade}` : ''}
              {linked.child.school_name ? ` · ${linked.child.school_name}` : ''}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link to={`/parent/children/${linked.child.id}`}>
              <Button full>See their journey</Button>
            </Link>
            <Button
              full
              variant="ghost"
              onClick={() => {
                setCode('')
                link.reset()
              }}
            >
              Link another child
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              link.mutate()
            }}
          >
            <div>
              <label
                htmlFor="link-code"
                className="mb-1.5 block text-sm font-medium text-ink-soft"
              >
                Linking code
              </label>
              <input
                id="link-code"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 6))
                }
                placeholder="ABC123"
                autoComplete="off"
                maxLength={6}
                className="h-14 w-full rounded-xl border border-slate-200 bg-card text-center text-2xl font-semibold tracking-[0.4em] text-ink uppercase outline-none transition-colors placeholder:text-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              {link.isError && (
                <p className="mt-1.5 text-xs text-band-red">{linkError(link.error)}</p>
              )}
            </div>
            <Button type="submit" full loading={link.isPending} disabled={code.length !== 6}>
              <Icon name="link" className="h-4 w-4" />
              Link child
            </Button>
          </form>
          <p className="mt-4 text-xs leading-relaxed text-ink-muted">
            Linking lets you see weekly effort stories — never marks or
            comparisons. Your child keeps full control of their account.
          </p>
        </Card>
      )}
    </div>
  )
}
