/**
 * Mirrors backend password policy (backend/app/schemas/password_reset.py
 * ResetPasswordRequest / FirstLoginResetRequest validators):
 * ≥8 chars, ≥1 uppercase, ≥1 number, ≥1 special from !@#$%^&*(),.?":{}|<>
 */
export interface PasswordRule {
  id: string
  label: string
  test: (password: string) => boolean
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'number', label: 'One number', test: (p) => /[0-9]/.test(p) },
  {
    id: 'special',
    label: 'One special character (e.g. ! @ # $)',
    test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p),
  },
]

export function passwordValid(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password))
}
