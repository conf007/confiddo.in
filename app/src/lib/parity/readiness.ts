/**
 * Readiness classification L1-L5 + display names + weekly averaging.
 *
 * Sources of truth:
 *   confiddo/backend/app/services/metrics_service.py:829-937
 *     (calculate_readiness_level_pure — top-down first-match gates)
 *   confiddo/backend/app/services/teacher_service.py:924-950
 *     (get_weekly_student_level — mean of per-test levels with PYTHON
 *      BANKER'S ROUNDING; no data -> "practicing")
 *   confiddo/frontend/lib/data/models/suggestion_model.dart:4-22
 *     (frontend display strings; avoidant -> "Needs Encouragement")
 *
 * DISPLAY/VERIFICATION ONLY — the backend stays authoritative.
 * Verified against the Python/Dart sources 2026-06-11.
 */

import type {
  AllMetrics,
  AttemptData,
  ReadinessCode,
  ReadinessLevel,
  ReadinessResult,
  SessionData,
} from "./types";
import {
  calculateAllMetricsPure,
  calculateStudentTheta,
  calculateWeightedAccuracy,
  pythonRound,
} from "./metrics";

// ──────────────────────────────────────────────────────────────────────
// Names & code <-> level maps
// ──────────────────────────────────────────────────────────────────────

/** Backend display names (metrics_service.py:857-863). */
export const READINESS_BACKEND_NAMES: Record<ReadinessLevel, string> = {
  1: "Avoidant",
  2: "Attempting",
  3: "Practicing",
  4: "Confident",
  5: "Competition Ready",
};

/** levels_map in teacher_service.py:937. */
export const READINESS_CODE_TO_LEVEL: Record<ReadinessCode, ReadinessLevel> = {
  avoidant: 1,
  attempting: 2,
  practicing: 3,
  confident: 4,
  competition_ready: 5,
};

export const READINESS_LEVEL_TO_CODE: Record<ReadinessLevel, ReadinessCode> = {
  1: "avoidant",
  2: "attempting",
  3: "practicing",
  4: "confident",
  5: "competition_ready",
};

/**
 * Student/teacher-facing display strings (suggestion_model.dart:4-9).
 * Note avoidant is softened to "Needs Encouragement" on the client.
 */
export const READINESS_DISPLAY_NAMES: Record<ReadinessCode, string> = {
  avoidant: "Needs Encouragement",
  attempting: "Attempting",
  practicing: "Practicing",
  confident: "Confident",
  competition_ready: "Competition Ready",
};

/**
 * Client display name for a readiness code. Unknown codes fall back to
 * "Practicing" (mirrors ReadinessLevel.fromCode orElse, suggestion_model.dart:16-21).
 */
export function readinessDisplayName(code: string): string {
  return READINESS_DISPLAY_NAMES[code as ReadinessCode] ?? READINESS_DISPLAY_NAMES.practicing;
}

// ──────────────────────────────────────────────────────────────────────
// Gate resolution (the L5 -> L1 top-down first-match logic)
// ──────────────────────────────────────────────────────────────────────

export interface ReadinessGateInputs {
  metrics: AllMetrics;
  /** green count INCLUDING neutrals (neutral counts as green, :850) */
  green: number;
  red: number;
  /** difficulty-weighted accuracy (already rounded to 4 dp) */
  wAcc: number;
  /** (answered hard/very_hard) / answered >= 0.15 (:885) */
  hasStrictDifficultyExposure: boolean;
  /** (hard/very_hard in test) / all questions < 0.20 (:891) */
  testLacksHard: boolean;
}

/**
 * Exact port of the gate cascade (metrics_service.py:893-937).
 * n = 15 metrics. Exposed separately so the gates can be unit-tested with
 * synthetic metric profiles (the pinned golden cases in ARCHITECTURE.md §8.3.18).
 */
export function resolveReadinessGates(inputs: ReadinessGateInputs): {
  level: ReadinessLevel;
  code: ReadinessCode;
} {
  const { metrics, green, red, wAcc, hasStrictDifficultyExposure, testLacksHard } = inputs;
  const n = 15;

  // Level 5: Competition Ready — ALWAYS requires difficulty exposure. No bypass, ever.
  if (
    green >= n - 1 &&
    red === 0 &&
    wAcc >= 0.8 &&
    metrics.rgd.status === "green" &&
    hasStrictDifficultyExposure
  ) {
    return { level: 5, code: "competition_ready" };
  }

  // Level 4: Confident — bypass difficulty gate only if the TEST lacks hard Qs.
  if (
    metrics.air.status === "green" &&
    metrics.dpi.status !== "red" &&
    metrics.scc.status === "green" &&
    metrics.rgd.status !== "red" &&
    metrics.fad.status !== "red" &&
    green >= 9 &&
    red <= 2 &&
    wAcc >= 0.55 &&
    (hasStrictDifficultyExposure || (testLacksHard && wAcc >= 0.75))
  ) {
    return { level: 4, code: "confident" };
  }

  // Level 3: Practicing
  if (
    metrics.air.status === "green" &&
    metrics.dpi.status !== "red" &&
    metrics.rgd.status !== "red" &&
    n - red >= 5 &&
    wAcc >= 0.35
  ) {
    return { level: 3, code: "practicing" };
  }

  // Level 2: Attempting — block random guessers with RGD gate
  const rgdRate = metrics.rgd.score;
  if (
    metrics.air.status !== "red" &&
    metrics.scc.status !== "red" &&
    rgdRate < 0.4 &&
    red <= 8
  ) {
    return { level: 2, code: "attempting" };
  }

  // Level 1: Avoidant — default fallback
  return { level: 1, code: "avoidant" };
}

// ──────────────────────────────────────────────────────────────────────
// calculate_readiness_level_pure (:829-937)
// ──────────────────────────────────────────────────────────────────────

export function calculateReadinessLevel(
  attempts: AttemptData[],
  session: SessionData,
): ReadinessResult {
  const metrics = calculateAllMetricsPure(attempts, session);

  const total = attempts.filter((a) => a.selectedOptionId !== null).length;
  const correct = attempts.filter((a) => a.isCorrect).length;
  const rawAccuracy = total > 0 ? correct / total : 0;
  const wAcc = calculateWeightedAccuracy(attempts);

  const statuses = Object.values(metrics).map((m) => m.status);
  // neutral counts as green — don't penalize for test structure (:850)
  const green =
    statuses.filter((s) => s === "green").length + statuses.filter((s) => s === "neutral").length;
  const yellow = statuses.filter((s) => s === "yellow").length;
  const red = statuses.filter((s) => s === "red").length;

  const theta = calculateStudentTheta(attempts);

  // Difficulty exposure: does the student have experience with hard questions? (:881-885)
  const attempted = attempts.filter((a) => a.selectedOptionId !== null);
  const hardAttempted = attempted.filter(
    (a) => a.difficulty === "hard" || a.difficulty === "very_hard",
  ).length;
  const studentHardRatio = attempted.length > 0 ? hardAttempted / attempted.length : 0;
  const hasStrictDifficultyExposure = studentHardRatio >= 0.15;

  // Does the TEST itself lack hard questions? (teacher's choice, not student's) (:888-891)
  const hardInTest = attempts.filter(
    (a) => a.difficulty === "hard" || a.difficulty === "very_hard",
  ).length;
  const testHardRatio = attempts.length > 0 ? hardInTest / attempts.length : 0;
  const testLacksHard = testHardRatio < 0.2;

  const { level, code } = resolveReadinessGates({
    metrics,
    green,
    red,
    wAcc,
    hasStrictDifficultyExposure,
    testLacksHard,
  });

  return {
    level,
    code,
    displayName: READINESS_BACKEND_NAMES[level],
    metrics,
    accuracy: rawAccuracy, // INTERNAL ONLY — never expose to students
    weightedAccuracy: wAcc,
    theta, // INTERNAL ONLY
    greenCount: green,
    yellowCount: yellow,
    redCount: red,
  };
}

/** Alias matching the Python name calculate_readiness_level_pure. */
export const calculateReadinessLevelPure = calculateReadinessLevel;

// ──────────────────────────────────────────────────────────────────────
// Weekly average level (teacher_service.py:924-950)
// ──────────────────────────────────────────────────────────────────────

/**
 * Weekly level = round(mean(per-test levels)) with PYTHON BANKER'S ROUNDING
 * (round-half-to-even): [4,5] -> mean 4.5 -> 4 ("confident"), NOT 5.
 * JS Math.round(4.5) === 5 — do not use it here (ARCHITECTURE.md §9.8).
 * No data -> default "practicing" (teacher_service.py:946-947).
 */
export function weeklyAverageLevel(levelValues: number[]): ReadinessCode {
  if (levelValues.length === 0) return "practicing";
  const avg = pythonRound(levelValues.reduce((s, v) => s + v, 0) / levelValues.length);
  return READINESS_LEVEL_TO_CODE[avg as ReadinessLevel] ?? "practicing";
}

/**
 * Same as weeklyAverageLevel but starting from level codes, mirroring
 * `levels_map.get(level, 1)` — unknown codes map to 1 (teacher_service.py:944).
 */
export function weeklyAverageLevelFromCodes(codes: string[]): ReadinessCode {
  return weeklyAverageLevel(codes.map((c) => READINESS_CODE_TO_LEVEL[c as ReadinessCode] ?? 1));
}
