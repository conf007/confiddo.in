/**
 * /student/link-parent — generate the 6-character parent linking code.
 * POST /student/parent-link-code (backend/app/api/student.py:245-301):
 * 24 h validity, single-use, regenerating expires older codes.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/icons'
import { friendlyError } from '../../lib/api/errors'
import {
  generateParentLinkCode,
  type ParentLinkCodeData,
} from '../../lib/api/student'

const STEPS = [
  'Generate your code below.',
  'Share it with your parent (it works once and lasts 24 hours).',
  'They enter it in their Confiddo app under "Link a Child".',
]

export function LinkParentPage() {
  const [copied, setCopied] = useState(false)

  const generate = useMutation({
    mutationFn: generateParentLinkCode,
    onSuccess: () => setCopied(false),
  })
  const code: ParentLinkCodeData | undefined = generate.data

  const copy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable — code is visible to copy manually */
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          to="/student"
          className="mb-3 inline-flex h-12 items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink-soft"
        >
          <Icon name="arrow-left" className="h-4 w-4" />
          Back to home
        </Link>
        <h1 className="text-2xl font-bold text-ink">Link a parent</h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Your parent sees your effort story — how you practice and grow.
          Never your answers or scores.
        </p>
      </div>

      <Card>
        <ol className="space-y-3">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-tint text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <span className="pt-1 text-sm leading-relaxed text-ink-soft">{step}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="text-center">
        {code ? (
          <>
            <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
              Your linking code
            </p>
            <p
              className="my-4 font-mono text-4xl font-bold tracking-[0.3em] text-primary"
              aria-live="polite"
            >
              {code.code}
            </p>
            <p className="mb-5 text-xs text-ink-muted">
              Valid for {code.valid_hours} hours · single use
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={copy} variant="primary">
                <Icon name={copied ? 'check' : 'clipboard'} className="h-4.5 w-4.5" />
                {copied ? 'Copied!' : 'Copy code'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => generate.mutate()}
                loading={generate.isPending}
              >
                Generate a new code
              </Button>
            </div>
          </>
        ) : (
          <>
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-tint text-primary">
              <Icon name="link" className="h-7 w-7" />
            </span>
            <p className="mb-5 text-sm text-ink-soft">
              Ready when you are — generating a new code replaces any older one.
            </p>
            <Button
              onClick={() => generate.mutate()}
              loading={generate.isPending}
            >
              Generate code
            </Button>
          </>
        )}
        {generate.isError && (
          <p className="mt-4 text-sm text-band-red" role="alert">
            {friendlyError(generate.error)}
          </p>
        )}
      </Card>
    </div>
  )
}
