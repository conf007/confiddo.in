import { PASSWORD_RULES } from '../../lib/auth/passwordRules'
import { Icon } from '../icons'

/** Live checklist mirroring the backend password policy. */
export function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password)
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-2 text-xs ${
              ok ? 'text-success' : 'text-ink-muted'
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full ${
                ok ? 'bg-success-tint' : 'bg-slate-100'
              }`}
            >
              <Icon name="check" className="h-3 w-3" />
            </span>
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}
