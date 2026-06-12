/**
 * Web-native share affordances for parent share cards: copy-to-clipboard
 * and a WhatsApp share link (https://wa.me/?text=). The Flutter app uses
 * the native share sheet; on web these two cover the same job.
 */
import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../icons'

function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function ShareActions({
  text,
  onShare,
  className = '',
}: {
  /** The message to copy / share. */
  text: string
  /** Optional hook (e.g. record the share server-side). Fire-and-forget. */
  onShare?: () => void
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    onShare?.()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable (http / permissions) — keep calm */
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Button variant="secondary" size="sm" onClick={copy}>
        <Icon name={copied ? 'check' : 'clipboard'} className="h-4 w-4" />
        {copied ? 'Copied!' : 'Copy message'}
      </Button>
      <a
        href={whatsAppShareUrl(text)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onShare?.()}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-success px-4 text-sm font-medium text-white transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success"
      >
        <Icon name="message" className="h-4 w-4" />
        Share on WhatsApp
      </a>
    </div>
  )
}
