import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Logo } from '../Logo'
import { subjectMeta } from '../student/subjects'

describe('Logo', () => {
  it('renders the petal mark with the wordmark', () => {
    const { container } = render(<Logo />)
    expect(container.querySelectorAll('ellipse').length).toBe(25)
    expect(screen.getByText('CONFIDDO')).toBeInTheDocument()
  })
})

describe('subjectMeta', () => {
  it('maps subjects to the app icons and names', () => {
    expect(subjectMeta('Mathematics')).toEqual({ icon: '🔢', name: 'Math' })
    expect(subjectMeta('Social Studies')).toEqual({ icon: '🌍', name: 'Social Studies' })
    expect(subjectMeta('geography')).toEqual({ icon: '📚', name: 'Geography' })
  })
})
