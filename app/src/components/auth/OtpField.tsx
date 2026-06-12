export interface OtpFieldProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  label?: string
}

/** 6-digit OTP input — single field, digits only. */
export function OtpField({
  value,
  onChange,
  disabled,
  label = 'Verification code',
}: OtpFieldProps) {
  return (
    <div>
      <label
        htmlFor="otp-code"
        className="mb-1.5 block text-sm font-medium text-ink-soft"
      >
        {label}
      </label>
      <input
        id="otp-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        placeholder="••••••"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="h-14 w-full rounded-xl border border-slate-200 bg-card text-center text-2xl font-semibold tracking-[0.5em] text-ink outline-none transition-colors placeholder:text-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
      />
    </div>
  )
}
