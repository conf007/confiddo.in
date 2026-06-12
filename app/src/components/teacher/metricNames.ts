/**
 * Friendly names for obfuscated metric codes (m01-m15).
 *
 * The explanation endpoint returns `code` as the DB metric_type (m01-m15,
 * backend/app/models/metrics.py) and a `name` that only resolves when the
 * code is an acronym (teacher_service.py:1302-1309 keys its map by AIR/TFA/…
 * while StudentMetric stores m-codes, so `name` usually falls back to the
 * raw code). The web resolves friendly names client-side instead, using the
 * parity lib's obfuscation map (src/lib/parity/types.ts METRIC_OBFUSCATION,
 * mirroring metrics_service.py:41-46) + the same teacher-facing labels the
 * backend defines (teacher_service.py:1302-1309).
 */
import { METRIC_OBFUSCATION } from '../../lib/parity'

/** Teacher-facing labels, keyed by acronym (teacher_service.py:1302-1309). */
const ACRONYM_LABELS: Record<string, string> = {
  AIR: 'Attempt Rate',
  TFA: 'Time to Accuracy',
  OCB: 'Answer Confidence',
  HUP: 'Hint Usage',
  PHE: 'Hesitation Events',
  SCC: 'Self-Correction',
  DPI: 'Difficulty Progression',
  RGD: 'Rapid Guessing',
  FAD: 'Fatigue Detection',
  TCR: 'Test Rhythm',
  HSB: 'Help-Seeking',
  PEB: 'Post-Error Behavior',
  EWP: 'Effort Pattern',
  DAP: 'Difficulty Adaptation',
  GEP: 'Knowledge Consistency',
}

/** m-code (m01) → acronym (AIR), inverted from METRIC_OBFUSCATION. */
const CODE_TO_ACRONYM: Record<string, string> = Object.fromEntries(
  Object.entries(METRIC_OBFUSCATION).map(([acr, code]) => [code, acr]),
)

/**
 * Resolve any metric identifier (m01-m15 or acronym) to its friendly
 * teacher-facing label. Unknown codes pass through unchanged — the web
 * reads metric codes defensively (ARCHITECTURE.md §9.16: legacy
 * OEP/ORB/m16 values may exist in old rows).
 */
export function metricFriendlyName(code: string): string {
  const acronym = CODE_TO_ACRONYM[code] ?? code
  return ACRONYM_LABELS[acronym] ?? code
}
