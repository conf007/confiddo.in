import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CHARACTERS } from '../../../lib/parity'
import { CHARACTER_ART } from '../characterArt'
import { CharacterAvatar } from '../CharacterAvatar'

describe('CharacterAvatar', () => {
  it('has artwork for every catalog character', () => {
    for (const c of CHARACTERS) {
      expect(CHARACTER_ART[c.id]?.svg, c.id).toMatch(/^<circle/)
      expect(CHARACTER_ART[c.id]?.svg).not.toMatch(/<script|<style| on\w+=/)
    }
  })

  it('renders the character art, greyed out when locked', () => {
    const { container, rerender } = render(<CharacterAvatar characterId="onyx" />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('viewBox')).toBe('0 0 120 120')
    expect(svg.querySelectorAll('circle, path, rect, ellipse, line, polygon').length).toBeGreaterThan(5)
    expect(svg.className.baseVal).not.toContain('grayscale')
    rerender(<CharacterAvatar characterId="onyx" locked />)
    expect(container.querySelector('svg')!.className.baseVal).toContain('grayscale')
  })

  it('falls back to the first starter for unknown ids', () => {
    const { container } = render(<CharacterAvatar characterId="noob" />)
    expect(container.firstElementChild?.getAttribute('data-character')).toBe('ace')
  })
})
