import { useState } from 'react'
import { Input, type InputProps } from '../ui/Input'
import { Icon } from '../icons'

/** Password input with a show/hide toggle (48px touch target). */
export function PasswordField(props: Omit<InputProps, 'type' | 'trailing'>) {
  const [visible, setVisible] = useState(false)
  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted hover:text-ink-soft focus-visible:outline-2 focus-visible:outline-primary"
          tabIndex={-1}
        >
          <Icon name={visible ? 'eye-off' : 'eye'} className="h-4.5 w-4.5" />
        </button>
      }
    />
  )
}
