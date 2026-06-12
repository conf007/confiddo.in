/**
 * Character catalog + XP unlock gates.
 *
 * Source of truth: confiddo/frontend/lib/core/utils/character_utils.dart:52-245
 * (starter :52-113, rare :116-157, epic :160-201, legendary :204-245).
 *
 * COUNT NOTE: ARCHITECTURE.md §4.4 says "16 characters", but the Dart catalog
 * and the backend's valid_characters list (backend/app/api/student.py:154-159)
 * both contain 18 ids (6 starter + 4 rare + 4 epic + 4 legendary). The code wins.
 *
 * IMPORTANT: the unlock gate is CLIENT-SIDE ONLY. PUT /v1/student/character
 * validates the ID against this 18-name list but does NOT verify XP
 * (backend/app/api/student.py:146-173) — the web app must replicate this gate
 * faithfully (ARCHITECTURE.md §9.5).
 *
 * Verified against the Dart + Python sources 2026-06-11.
 */

export type CharacterRarity = "starter" | "rare" | "epic" | "legendary";

export interface CharacterInfo {
  id: string;
  name: string;
  rarity: CharacterRarity;
  requiredXp: number;
}

/** All 18 characters in catalog order (starter, rare, epic, legendary). */
export const CHARACTERS: readonly CharacterInfo[] = [
  // Starter (free) — character_utils.dart:52-113
  { id: "ace", name: "Ace", rarity: "starter", requiredXp: 0 },
  { id: "kira", name: "Kira", rarity: "starter", requiredXp: 0 },
  { id: "raze", name: "Raze", rarity: "starter", requiredXp: 0 },
  { id: "luna", name: "Luna", rarity: "starter", requiredXp: 0 },
  { id: "dash", name: "Dash", rarity: "starter", requiredXp: 0 },
  { id: "zep", name: "Zep", rarity: "starter", requiredXp: 0 },
  // Rare — character_utils.dart:116-157
  { id: "onyx", name: "Onyx", rarity: "rare", requiredXp: 1000 },
  { id: "echo", name: "Echo", rarity: "rare", requiredXp: 1500 },
  { id: "fang", name: "Fang", rarity: "rare", requiredXp: 2000 },
  { id: "circuit", name: "Circuit", rarity: "rare", requiredXp: 2500 },
  // Epic — character_utils.dart:160-201
  { id: "spectre", name: "Spectre", rarity: "epic", requiredXp: 3500 },
  { id: "viper", name: "Viper", rarity: "epic", requiredXp: 4000 },
  { id: "aurora", name: "Aurora", rarity: "epic", requiredXp: 4500 },
  { id: "havoc", name: "Havoc", rarity: "epic", requiredXp: 5500 },
  // Legendary — character_utils.dart:204-245
  { id: "pharaoh", name: "Pharaoh", rarity: "legendary", requiredXp: 6500 },
  { id: "zenith_prime", name: "Zenith Prime", rarity: "legendary", requiredXp: 7500 },
  { id: "drakon", name: "Drakon", rarity: "legendary", requiredXp: 8500 },
  { id: "apex", name: "Apex", rarity: "legendary", requiredXp: 10000 },
] as const;

/**
 * Student.selected_character DB default (backend/app/models/student.py:25).
 * NOT in the selectable catalog — getCharacter falls back to the first starter.
 */
export const DEFAULT_CHARACTER_ID = "noob";

/**
 * Lookup by id; unknown/null ids fall back to the first starter ("ace"),
 * mirroring CharacterUtils.getCharacter (character_utils.dart:254-260).
 */
export function getCharacter(id?: string | null): CharacterInfo {
  if (id == null) return CHARACTERS[0];
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

/** Unlocked when total_points >= requiredXp. */
export function isUnlocked(id: string, totalXp: number): boolean {
  const c = CHARACTERS.find((ch) => ch.id === id);
  return c !== undefined && totalXp >= c.requiredXp;
}

/** All characters unlockable at the given XP (totalXp >= requiredXp). */
export function unlockable(totalXp: number): CharacterInfo[] {
  return CHARACTERS.filter((c) => totalXp >= c.requiredXp);
}
