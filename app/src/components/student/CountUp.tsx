/**
 * Animated number count-up for XP reveal moments (completion screen).
 * requestAnimationFrame + ease-out; respects prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from 'react'

export interface CountUpProps {
  to: number
  /** ms */
  duration?: number
  /** delay before starting, ms */
  delay?: number
  className?: string
  /** Render a leading + for positive values */
  signed?: boolean
}

export function CountUp({
  to,
  duration = 900,
  delay = 0,
  className = '',
  signed = false,
}: CountUpProps) {
  const [value, setValue] = useState(0)
  const raf = useRef<number>(0)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || to === 0) {
      raf.current = requestAnimationFrame(() => setValue(to))
      return () => cancelAnimationFrame(raf.current)
    }
    let start: number | null = null
    const timer = setTimeout(() => {
      const step = (ts: number) => {
        start ??= ts
        const t = Math.min(1, (ts - start) / duration)
        const eased = 1 - Math.pow(1 - t, 3)
        setValue(Math.round(to * eased))
        if (t < 1) raf.current = requestAnimationFrame(step)
      }
      raf.current = requestAnimationFrame(step)
    }, delay)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(raf.current)
    }
  }, [to, duration, delay])

  const sign = signed && value > 0 ? '+' : ''
  return <span className={className}>{sign}{value}</span>
}
