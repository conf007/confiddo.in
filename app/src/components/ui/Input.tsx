import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  /** Element rendered inside the field on the right (e.g. show-password). */
  trailing?: ReactNode
}

export function Input({
  label,
  hint,
  error,
  trailing,
  className = '',
  id,
  ...rest
}: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-ink-soft"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={[
            'h-12 w-full rounded-xl border bg-card px-4 text-sm text-ink',
            'placeholder:text-ink-muted/70 outline-none transition-colors',
            error
              ? 'border-band-red focus:border-band-red focus:ring-2 focus:ring-band-red/15'
              : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/15',
            trailing ? 'pr-12' : '',
            className,
          ].join(' ')}
          {...rest}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-2 flex items-center">
            {trailing}
          </div>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-band-red">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
