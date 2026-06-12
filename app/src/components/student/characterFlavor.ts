/**
 * Presentational flavor for the 18-character catalog: vibe line, description
 * and tags shown on cards/detail sheets.
 *
 * TODO-parity: source of truth is frontend/lib/core/utils/character_utils.dart
 * :52-245 (vibe/description/tags fields). The parity lib
 * (src/lib/parity/characters.ts — DO NOT MODIFY, owned by another agent)
 * ports only id/name/rarity/requiredXp, so the flavor strings live here until
 * the parity lib grows them. Catalog identity (ids, XP gates) still comes from
 * the parity lib — this map is display-only.
 */
import type { CharacterRarity } from '../../lib/parity'

export interface CharacterFlavor {
  vibe: string
  description: string
  tags: [string, string]
}

export const CHARACTER_FLAVOR: Record<string, CharacterFlavor> = {
  // Starter — character_utils.dart:52-113
  ace: { vibe: 'Cool & confident', description: 'The coolest kid with the freshest headphones.', tags: ['Cool', 'Music'] },
  kira: { vibe: 'Sweet but savage', description: 'Cat ear hoodie and a heart of gold.', tags: ['Cute', 'Bold'] },
  raze: { vibe: 'Street legend', description: 'Masked up and ready to roll.', tags: ['Street', 'Cool'] },
  luna: { vibe: 'Stargazer vibes', description: 'Lost in the cosmos, found in the stars.', tags: ['Dreamy', 'Space'] },
  dash: { vibe: 'Always winning', description: 'Speed is life, victory is destiny.', tags: ['Fast', 'Sport'] },
  zep: { vibe: 'Too cool to care', description: 'Hoodie up, vibes on, world out.', tags: ['Chill', 'Relaxed'] },
  // Rare — character_utils.dart:116-157
  onyx: { vibe: 'Silent guardian', description: 'Dark knight of the digital realm.', tags: ['Dark', 'Knight'] },
  echo: { vibe: 'Drop the beat', description: 'Sound waves are just the beginning.', tags: ['Music', 'DJ'] },
  fang: { vibe: 'Pack leader', description: 'Wolf spirit running through the veins.', tags: ['Wild', 'Wolf'] },
  circuit: { vibe: 'Big brain energy', description: 'Tech prodigy with LED dreams.', tags: ['Tech', 'Smart'] },
  // Epic — character_utils.dart:160-201
  spectre: { vibe: 'Now you see me...', description: 'Ghost assassin of the shadow realm.', tags: ['Ghost', 'Mystery'] },
  viper: { vibe: 'Cold-blooded king', description: 'Snake-themed with deadly precision.', tags: ['Snake', 'Deadly'] },
  aurora: { vibe: 'Multiverse queen', description: 'Northern lights flow through her soul.', tags: ['Magic', 'Rainbow'] },
  havoc: { vibe: 'Chaos is a ladder', description: 'Chaos energy personified.', tags: ['Chaos', 'Wild'] },
  // Legendary — character_utils.dart:204-245
  pharaoh: { vibe: 'Born to rule', description: 'Gold-adorned ruler of ancient power.', tags: ['Royal', 'Gold'] },
  zenith_prime: { vibe: 'Final form activated', description: 'The ultimate evolution of cool.', tags: ['Prime', 'Ultimate'] },
  drakon: { vibe: 'Fear the flame', description: 'Mythic dragon hybrid of legends.', tags: ['Dragon', 'Fire'] },
  apex: { vibe: 'The one & only', description: 'Ultimate champion. No equal.', tags: ['Champion', 'Elite'] },
}

export const RARITY_LABELS: Record<CharacterRarity, string> = {
  starter: 'Starter',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
}
