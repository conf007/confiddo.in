type LogoVariant = 'light' | 'dark'

export interface LogoProps {
  variant?: LogoVariant
  withWordmark?: boolean
  className?: string
}

const PETALS: [number, number, number, number, string, number, number][] = [
  [142.6, 54, 11.4, 19, '#2563EB', 0.9, 140],
  [163.5, 66.5, 10.8, 18, '#3B73EC', 0.95, 172.5],
  [168.5, 88, 11.4, 19, '#5B83EB', 0.9, 205],
  [158, 112, 10.8, 18, '#7F93E9', 0.95, 237.5],
  [134, 130, 11.4, 19, '#A7A0DD', 0.9, 270],
  [102, 137, 10.8, 18, '#C99EB6', 0.95, 302.5],
  [68, 128, 11.4, 19, '#E0897E', 0.9, 335],
  [46, 108, 10.8, 18, '#EF7942', 0.95, 7.5],
  [40, 82, 11.4, 19, '#FF6B00', 0.9, 40],
]
const FLOWER = ['#FF4500', '#FF5500', '#FF6500', '#FF7500', '#FF8500', '#FF9500', '#FFA500', '#FFB800']

export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="22 32 164 122" className={className} aria-hidden="true">
      {PETALS.map(([cx, cy, rx, ry, fill, opacity, rot]) => (
        <ellipse key={fill} cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} opacity={opacity} transform={`rotate(${rot} ${cx} ${cy})`} />
      ))}
      {FLOWER.map((fill, i) => (
        <ellipse key={fill} cx="104" cy="87" rx="6.4" ry="13" fill={fill} opacity="0.95" transform={`rotate(${i * 45} 104 100)`} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse key={i} cx="104" cy="92" rx="4.4" ry="8" fill="#FFD700" opacity="0.75" transform={`rotate(${22.5 + i * 45} 104 100)`} />
      ))}
      <circle cx="104" cy="100" r="6" fill="#FF4500" />
      <circle cx="104" cy="100" r="3.6" fill="#FFD700" />
      <circle cx="104" cy="100" r="1.6" fill="white" />
    </svg>
  )
}

export function Logo({ variant = 'dark', withWordmark = true, className = '' }: LogoProps) {
  const text = variant === 'light' ? 'text-white' : 'text-ink'
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="h-11 w-14 shrink-0" />
      {withWordmark && (
        <span className={`text-sm font-extrabold tracking-[0.2em] ${text}`}>CONFIDDO</span>
      )}
    </span>
  )
}
