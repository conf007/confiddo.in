import { Icon } from '../icons'

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl bg-band-red/5 px-4 py-3 text-sm leading-relaxed text-band-red"
    >
      <Icon name="alert" className="mt-0.5 h-4.5 w-4.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
