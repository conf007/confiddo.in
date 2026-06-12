/**
 * XP economy — constants, level helpers, and a pure model of the award pipeline.
 *
 * Sources of truth:
 *   confiddo/backend/app/services/gamification_service.py
 *     constants :28-54, _calculate_level :71-76, award_session_points :92-348
 *   confiddo/frontend/lib/core/constants/xp_rules.dart (explainer constants;
 *     documented mismatches noted below — the BACKEND wins)
 *
 * computeExpectedAward() is a VERIFICATION-ONLY pure model of
 * award_session_points: the web app never awards XP itself, it renders the
 * `gamification` block from POST /sessions/{id}/complete. This model exists
 * for parity tests and "expected XP" explainability.
 *
 * Verified against the Python/Dart sources 2026-06-11.
 */

// ──────────────────────────────────────────────────────────────────────
// Constants (gamification_service.py:28-54)
// ──────────────────────────────────────────────────────────────────────

export const LEVEL_THRESHOLDS = [0, 50, 200, 500, 1000] as const; // :28
export const LEVEL_NAMES = [
  "Explorer",
  "Rising Star",
  "Super Nova",
  "Blazing Pro",
  "Galaxy Master",
] as const; // :29

export const XP_CORRECT_NO_HINT = 4; // :33
export const XP_CORRECT_WITH_HINT = 3; // :34
export const XP_WRONG_PERSISTED = 2; // :35
export const XP_WRONG_GAVE_UP = 0; // :36
export const XP_WRONG_NO_REVIEW = -1; // :37
export const XP_SKIP_PENALTY = -2; // :38
export const XP_TEST_COMPLETED = 10; // :39
export const XP_FIRST_TODAY = 5; // :40
export const XP_COMEBACK = 10; // :41
export const XP_REVIEW = 3; // :42

/**
 * Curiosity bonus: +1 per correct question whose solution was viewed AFTER
 * the correct answer (gamification_service.py:189-191).
 * MISMATCH NOTE: the Flutter explainer shows +3 (xp_rules.dart:40
 * `curiousLearner = 3`) — the backend awards +1 and the backend wins
 * (ARCHITECTURE.md §9.3).
 */
export const XP_CURIOSITY_BONUS = 1;

export const QUALITY_MULTIPLIERS: Record<number, number> = {
  1: 0.5,
  2: 0.75,
  3: 1.0,
  4: 1.25,
  5: 1.5,
}; // :45

export const XP_PENALTY_SKIPPED = -1; // :48
export const XP_PENALTY_INCORRECT = -1; // :49
/**
 * Per-app-switch penalty (:50). Applied as: first switch -2, each ADDITIONAL
 * switch -3 (:291). MISMATCH NOTE: xp_rules.dart:54 shows a flat -2 — the
 * backend formula wins (ARCHITECTURE.md §9.4).
 */
export const XP_PENALTY_APP_SWITCH = -3;

// ──────────────────────────────────────────────────────────────────────
// Level helpers (:71-76 + xp_rules.dart:72-85)
// ──────────────────────────────────────────────────────────────────────

/** Level = highest index i with totalPoints >= LEVEL_THRESHOLDS[i] (gamification_service.py:71-76). */
export function levelFor(totalPoints: number): number {
  let level = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalPoints >= LEVEL_THRESHOLDS[i]) level = i;
  }
  return level;
}

export function levelName(totalPoints: number): string {
  return LEVEL_NAMES[levelFor(totalPoints)];
}

/** The next threshold to cross, or null at the top level. */
export function nextLevelPoints(totalPoints: number): number | null {
  const level = levelFor(totalPoints);
  if (level >= LEVEL_THRESHOLDS.length - 1) return null;
  return LEVEL_THRESHOLDS[level + 1];
}

/** XP still needed to reach the next level, or null at the top (xp_rules.dart:80-85). */
export function xpToNextLevel(totalPoints: number): number | null {
  const next = nextLevelPoints(totalPoints);
  return next === null ? null : next - totalPoints;
}

// ──────────────────────────────────────────────────────────────────────
// Pure model of award_session_points (:92-348)
// ──────────────────────────────────────────────────────────────────────

/** Per-question facts as the backend derives them from QuestionAttempt rows. */
export interface XpAttemptFacts {
  isCorrect: boolean;
  hintsUsed: number;
  persistedAfterWrong: boolean;
  gaveUpAfterWrong: boolean;
  /** feeds the +1 curiosity bonus (:189-191) */
  solutionViewedAfterCorrect: boolean;
}

export interface XpSessionFacts {
  /** One entry per QuestionAttempt row in the session (questions VIEWED). */
  attempts: XpAttemptFacts[];
  totalQuestions: number;
  /**
   * Anti-farming gate (:119-144): true when a test_completed/question_attempted
   * transaction already exists for the same test in another session since
   * Monday of the current week.
   */
  alreadyAwardedThisWeek: boolean;
  /** No other completed non-revision session today (:214-224). */
  isFirstTestToday: boolean;
  /** Whole days since last_active_date; null = never active before. */
  daysSinceLastActive: number | null;
  /** StudentPoints.current_streak before this award. */
  currentStreak: number;
  /** Live readiness level 1-5; the backend defaults to 3 on metrics failure (:259-260). */
  readinessLevel: number;
  skippedWithoutReview: number;
  incorrectWithoutReview: number;
  /** Client-counted absences > 30 s. */
  appSwitches: number;
}

export interface XpBreakdownEntry {
  label: string;
  points: number;
}

export interface ExpectedAward {
  /**
   * Per-session total. CAN BE NEGATIVE — only the student's cumulative
   * total_points is floored at 0, server-side
   * (`sp.total_points = max(0, sp.total_points + total_earned)`,
   * gamification_service.py:335 / ARCHITECTURE.md §9.11).
   */
  totalEarned: number;
  breakdown: XpBreakdownEntry[];
  isPracticeOnly: boolean;
  /** The streak the backend projects when deciding the 7+ multiplier (:236-241). */
  projectedStreak: number;
}

/** Python floor division `//` — floors toward -inf (differs from trunc for negatives). */
const floorDiv = (a: number, b: number): number => Math.floor(a / b);

/**
 * Exact 8-step pipeline ORDER of award_session_points (:92-348):
 *   0. anti-farming gate -> 0 XP, is_practice_only
 *   1. per-question XP (incl. +1 curiosity)
 *   2. skip penalty
 *   3. completion bonus +10
 *   4. first-today +5
 *   5. comeback +10
 *   6. streak bonus = base_points // 2 when projected streak >= 7
 *   7. quality multiplier: total = int(total * mult) — Python int()
 *      TRUNCATES TOWARD ZERO (int(102.5)=102, int(-7.5)=-7) -> Math.trunc
 *   8. review/app-switch penalties AFTER the multiplier, UNSCALED
 *      (first switch -2, each additional -3)
 */
export function computeExpectedAward(facts: XpSessionFacts): ExpectedAward {
  // Projected streak (computed at :236-241, but derived here up front)
  let projectedStreak: number;
  if (facts.daysSinceLastActive === 1) projectedStreak = facts.currentStreak + 1;
  else if (facts.daysSinceLastActive === 0) projectedStreak = facts.currentStreak;
  else projectedStreak = 1;

  // ── Step 0: anti-farming gate (:119-144) ──
  if (facts.alreadyAwardedThisWeek) {
    return {
      totalEarned: 0,
      breakdown: [{ label: "Practice complete (XP already earned this week)", points: 0 }],
      isPracticeOnly: true,
      projectedStreak,
    };
  }

  const breakdown: XpBreakdownEntry[] = [];
  let basePoints = 0;

  // ── Step 1: per-question XP (:170-196) ──
  let questionPoints = 0;
  for (const a of facts.attempts) {
    if (a.isCorrect && a.hintsUsed === 0) questionPoints += XP_CORRECT_NO_HINT;
    else if (a.isCorrect && a.hintsUsed > 0) questionPoints += XP_CORRECT_WITH_HINT;
    else if (!a.isCorrect && a.persistedAfterWrong) questionPoints += XP_WRONG_PERSISTED;
    else if (!a.isCorrect && a.gaveUpAfterWrong) questionPoints += XP_WRONG_GAVE_UP;
    else if (!a.isCorrect) questionPoints += XP_WRONG_NO_REVIEW;

    if (a.isCorrect && a.solutionViewedAfterCorrect) questionPoints += XP_CURIOSITY_BONUS;
  }
  const attemptedCount = facts.attempts.length;
  if (attemptedCount > 0) {
    breakdown.push({ label: `${attemptedCount} questions attempted`, points: questionPoints });
  }
  basePoints += questionPoints;

  // ── Step 2: skip penalty (:199-203) ──
  const skippedCount = Math.max(0, facts.totalQuestions - attemptedCount);
  if (skippedCount > 0) {
    const skipPenalty = skippedCount * XP_SKIP_PENALTY;
    breakdown.push({ label: `${skippedCount} questions skipped`, points: skipPenalty });
    basePoints += skipPenalty;
  }

  // ── Step 3: completion bonus (:206-209) ──
  if (attemptedCount >= facts.totalQuestions && facts.totalQuestions > 0) {
    breakdown.push({ label: "Test completed fully", points: XP_TEST_COMPLETED });
    basePoints += XP_TEST_COMPLETED;
  }

  // ── Step 4: first test today (:214-224) ──
  if (facts.isFirstTestToday) {
    breakdown.push({ label: "First test today", points: XP_FIRST_TODAY });
    basePoints += XP_FIRST_TODAY;
  }

  // ── Step 5: comeback (:227-230) ──
  if (facts.daysSinceLastActive !== null && facts.daysSinceLastActive >= 3) {
    breakdown.push({ label: "Comeback bonus", points: XP_COMEBACK });
    basePoints += XP_COMEBACK;
  }

  // ── Step 6: streak multiplier (:232-247) ──
  // bonus = base_points // 2 (floor division; 1.5x total). The bonus is ALWAYS
  // added to the total when streak >= 7, but the breakdown entry only appears
  // when the bonus is > 0 (matching the Python transaction condition :245-247).
  let multiplierBonus = 0;
  if (projectedStreak >= 7) {
    multiplierBonus = floorDiv(basePoints, 2);
    if (multiplierBonus > 0) {
      breakdown.push({ label: "7+ day streak (1.5x)", points: multiplierBonus });
    }
  }

  let totalEarned = basePoints + multiplierBonus;

  // ── Step 7: quality multiplier (:251-270) ──
  const qualityMult = QUALITY_MULTIPLIERS[facts.readinessLevel] ?? 1.0;
  if (qualityMult !== 1.0) {
    const preQuality = totalEarned;
    totalEarned = Math.trunc(totalEarned * qualityMult); // Python int() truncates toward zero
    const qualityDelta = totalEarned - preQuality;
    if (qualityDelta !== 0) {
      breakdown.push({
        label: `Readiness L${facts.readinessLevel} (${qualityMult.toFixed(2)}x)`,
        points: qualityDelta,
      });
    }
  }

  // ── Step 8: review/focus penalties — AFTER the multiplier, UNSCALED (:272-296) ──
  let penaltyPoints = 0;
  if (facts.skippedWithoutReview > 0) {
    const skippedPenalty = facts.skippedWithoutReview * XP_PENALTY_SKIPPED;
    breakdown.push({
      label: `${facts.skippedWithoutReview} skipped (no review)`,
      points: skippedPenalty,
    });
    penaltyPoints += skippedPenalty;
  }
  if (facts.incorrectWithoutReview > 0) {
    const incorrectPenalty = facts.incorrectWithoutReview * XP_PENALTY_INCORRECT;
    breakdown.push({
      label: `${facts.incorrectWithoutReview} wrong (no review)`,
      points: incorrectPenalty,
    });
    penaltyPoints += incorrectPenalty;
  }
  if (facts.appSwitches > 0) {
    // First switch -2, each additional -3 (:291)
    const focusPenalty =
      facts.appSwitches > 1 ? -2 + (facts.appSwitches - 1) * XP_PENALTY_APP_SWITCH : -2;
    breakdown.push({ label: `Lost focus (${facts.appSwitches}x)`, points: focusPenalty });
    penaltyPoints += focusPenalty;
  }

  totalEarned += penaltyPoints; // penaltyPoints is negative

  return { totalEarned, breakdown, isPracticeOnly: false, projectedStreak };
}
