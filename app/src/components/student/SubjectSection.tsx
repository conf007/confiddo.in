import { useState, type ReactNode } from 'react'
import { Icon } from '../icons'
import { ProgressBar } from './ProgressBar'
import { subjectMeta } from './subjects'
import type { StudentTest } from '../../lib/api/student'

export function SubjectSection({
  subject,
  tests,
  children,
  defaultOpen = true,
}: {
  subject: string
  tests: StudentTest[]
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const meta = subjectMeta(subject)
  const done = tests.filter((t) => t.session_status === 'completed').length
  const teacher = tests.find((t) => t.teacher_name)?.teacher_name
  return (
    <section aria-label={meta.name} data-testid={`subject-${subject}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 rounded-card bg-card p-4 text-left shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-2xl" aria-hidden="true">
          {meta.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-ink">{meta.name}</span>
          <span className="block text-xs text-ink-muted">
            {done}/{tests.length} completed{teacher ? ` • ${teacher}` : ''}
          </span>
          <span className="mt-2 block">
            <ProgressBar value={tests.length ? done / tests.length : 0} tone="primary" label={`${meta.name} completion`} />
          </span>
        </span>
        <Icon name="chevron-down" className={`h-5 w-5 shrink-0 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>}
    </section>
  )
}
