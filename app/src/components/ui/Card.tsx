import type { HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean
}

export function Card({
  padded = true,
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        'bg-card rounded-card shadow-soft',
        padded ? 'p-6' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
