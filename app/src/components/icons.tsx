/**
 * Minimal inline icon set (24x24, 2px stroke) — keeps the bundle free of an
 * icon library for the auth/routing skeleton. Lucide-style geometry.
 */
import type { SVGProps } from 'react'

export type IconName =
  | 'home'
  | 'chart'
  | 'medal'
  | 'sparkles'
  | 'users'
  | 'school'
  | 'settings'
  | 'bell'
  | 'menu'
  | 'close'
  | 'chevron-left'
  | 'chevron-down'
  | 'logout'
  | 'book'
  | 'clipboard'
  | 'search'
  | 'link'
  | 'device'
  | 'flame'
  | 'user'
  | 'eye'
  | 'eye-off'
  | 'arrow-left'
  | 'check'
  | 'mail'
  | 'lock'
  | 'alert'
  | 'backpack'
  | 'grid'
  | 'chart-line'
  | 'message'

const PATHS: Record<IconName, ReadonlyArray<string>> = {
  home: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h14V9.5', 'M9 21v-6h6v6'],
  chart: ['M3 21h18', 'M7 17V9', 'M12 17V4', 'M17 17v-5'],
  medal: ['M8.2 13.2 6.8 21l5.2-3 5.2 3-1.4-7.8', 'M12 4a5 5 0 1 1 0 10a5 5 0 0 1 0-10'],
  sparkles: [
    'M12 3l1.9 4.7L18.5 9.5l-4.6 1.8L12 16l-1.9-4.7L5.5 9.5l4.6-1.8L12 3z',
    'M19 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z',
  ],
  users: [
    'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    'M2.5 20c.8-3.4 3.3-5 6.5-5s5.7 1.6 6.5 5',
    'M15.5 4.6a3.5 3.5 0 0 1 0 6.8',
    'M17.8 15.4c2.2.6 3.3 2 3.7 4.6',
  ],
  school: ['M4 21V9l8-5 8 5v12', 'M9 21v-5h6v5', 'M3 21h18'],
  settings: [
    'M4 7h9', 'M17 7h3', 'M15 5v4',
    'M4 17h3', 'M11 17h9', 'M9 15v4',
  ],
  bell: [
    'M6 9a6 6 0 1 1 12 0c0 4.6 1.8 5.8 1.8 5.8H4.2S6 13.6 6 9z',
    'M10 18.8a2.3 2.3 0 0 0 4 0',
  ],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  'chevron-left': ['M14.5 6 8.5 12l6 6'],
  'chevron-down': ['M6 9.5l6 6 6-6'],
  logout: [
    'M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3',
    'M16 17l5-5-5-5',
    'M21 12H9',
  ],
  book: [
    'M4 19.5A2.5 2.5 0 0 1 6.5 17H20',
    'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  ],
  clipboard: [
    'M9 4h6v3H9z',
    'M15 4h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3',
    'M9 12h6',
    'M9 16h6',
  ],
  search: ['M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z', 'M21 21l-4.4-4.4'],
  link: [
    'M10 13a5 5 0 0 0 7.5.5l2.5-2.5a5 5 0 0 0-7-7l-1.5 1.5',
    'M14 11a5 5 0 0 0-7.5-.5L4 13a5 5 0 0 0 7 7l1.5-1.5',
  ],
  device: ['M3 5h18v12H3z', 'M8 21h8', 'M12 17v4'],
  flame: [
    'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z',
  ],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21c1-4 4-6 8-6s7 2 8 6'],
  eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  'eye-off': [
    'M9.9 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.4 3.3',
    'M6.2 6.2A17 17 0 0 0 2 12s3.5 7 10 7c1.5 0 2.9-.3 4.1-.9',
    'M3 3l18 18',
    'M9.9 9.9a3 3 0 0 0 4.2 4.2',
  ],
  'arrow-left': ['M19 12H5', 'M11 18l-6-6 6-6'],
  check: ['M5 13l4 4L19 7'],
  mail: ['M3 5h18v14H3z', 'M3 7l9 6 9-6'],
  lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  alert: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 8v5', 'M12 16.5h.01'],
  backpack: [
    'M5 10a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v11H5V10z',
    'M9 7V5a3 3 0 0 1 6 0v2',
    'M5 14h14',
    'M9 18h6',
  ],
  grid: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  'chart-line': ['M3 3v18h18', 'M7 14l4-4 3 3 5-6'],
  message: ['M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z'],
}

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
}

export function Icon({ name, className = 'h-5 w-5', ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
