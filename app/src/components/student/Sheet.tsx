/**
 * Sheet — bottom sheet on mobile, centered dialog on >=768px. Used for the
 * hint panel, solution panel and character detail (mirrors the Flutter
 * bottom sheets, re-expressed web-natively). Plain CSS transitions only.
 */
import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from '../icons'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Allow dismissing via backdrop/escape/close button (default true). */
  dismissible?: boolean
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  dismissible = true,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !dismissible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, dismissible, onClose])

  // Move focus into the sheet when it opens
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close"
        onClick={dismissible ? onClose : undefined}
        className="absolute inset-0 cursor-default bg-navy/40 animate-[sheet-fade_200ms_ease-out]"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={[
          'relative w-full max-w-[480px] bg-card shadow-soft outline-none',
          'rounded-t-3xl md:rounded-3xl',
          'max-h-[85dvh] overflow-y-auto',
          'px-[6%] py-6 md:px-8',
          'animate-[sheet-rise_240ms_ease-out]',
        ].join(' ')}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 md:hidden" />
        {(title || dismissible) && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-12 w-12 -mr-2 items-center justify-center rounded-full text-ink-muted hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>

      {/* Local keyframes — tasteful CSS only, no animation libs */}
      <style>{`
        @keyframes sheet-rise { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes sheet-fade { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  )
}
