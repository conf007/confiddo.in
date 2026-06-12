/**
 * §8.3 groups 19-20 — XP pipeline model + level helpers
 * (gamification_service.py:28-348, xp_rules.dart:63-85).
 * Hand-pinned from the Python source; arithmetic shown per case.
 * Python semantics verified with CPython 3.14: int(102.5)=102, int(-7.5)=-7
 * (truncation toward zero), 55//2=27, -15//2=-8 (floor division).
 */
import { describe, expect, it } from "vitest";
import {
  computeExpectedAward,
  LEVEL_NAMES,
  LEVEL_THRESHOLDS,
  levelFor,
  levelName,
  nextLevelPoints,
  QUALITY_MULTIPLIERS,
  XP_COMEBACK,
  XP_CORRECT_NO_HINT,
  XP_CORRECT_WITH_HINT,
  XP_CURIOSITY_BONUS,
  XP_FIRST_TODAY,
  XP_PENALTY_APP_SWITCH,
  XP_PENALTY_INCORRECT,
  XP_PENALTY_SKIPPED,
  XP_REVIEW,
  XP_SKIP_PENALTY,
  XP_TEST_COMPLETED,
  XP_WRONG_GAVE_UP,
  XP_WRONG_NO_REVIEW,
  XP_WRONG_PERSISTED,
  xpToNextLevel,
  type XpAttemptFacts,
  type XpSessionFacts,
} from "../xp";

const q = (over: Partial<XpAttemptFacts> = {}): XpAttemptFacts => ({
  isCorrect: false,
  hintsUsed: 0,
  persistedAfterWrong: false,
  gaveUpAfterWrong: false,
  solutionViewedAfterCorrect: false,
  ...over,
});

const facts = (over: Partial<XpSessionFacts> = {}): XpSessionFacts => ({
  attempts: [],
  totalQuestions: 10,
  alreadyAwardedThisWeek: false,
  isFirstTestToday: false,
  daysSinceLastActive: 0,
  currentStreak: 0,
  readinessLevel: 3,
  skippedWithoutReview: 0,
  incorrectWithoutReview: 0,
  appSwitches: 0,
  ...over,
});

describe("XP constants (gamification_service.py:28-50)", () => {
  it("level thresholds and names", () => {
    expect(LEVEL_THRESHOLDS).toEqual([0, 50, 200, 500, 1000]);
    expect(LEVEL_NAMES).toEqual(["Explorer", "Rising Star", "Super Nova", "Blazing Pro", "Galaxy Master"]);
  });

  it("per-question values", () => {
    expect(XP_CORRECT_NO_HINT).toBe(4);
    expect(XP_CORRECT_WITH_HINT).toBe(3);
    expect(XP_WRONG_PERSISTED).toBe(2);
    expect(XP_WRONG_GAVE_UP).toBe(0);
    expect(XP_WRONG_NO_REVIEW).toBe(-1);
    expect(XP_SKIP_PENALTY).toBe(-2);
    expect(XP_TEST_COMPLETED).toBe(10);
    expect(XP_FIRST_TODAY).toBe(5);
    expect(XP_COMEBACK).toBe(10);
    expect(XP_REVIEW).toBe(3);
    // Backend awards +1, NOT the +3 shown in xp_rules.dart:40 (ARCHITECTURE §9.3)
    expect(XP_CURIOSITY_BONUS).toBe(1);
    expect(XP_PENALTY_SKIPPED).toBe(-1);
    expect(XP_PENALTY_INCORRECT).toBe(-1);
    expect(XP_PENALTY_APP_SWITCH).toBe(-3);
  });

  it("quality multipliers", () => {
    expect(QUALITY_MULTIPLIERS).toEqual({ 1: 0.5, 2: 0.75, 3: 1.0, 4: 1.25, 5: 1.5 });
  });
});

describe("computeExpectedAward — §8.3.19 golden", () => {
  it("perfect 10/10 no hints, first today, streak 7, readiness L4: 55 -> +27 -> int(82*1.25)=102", () => {
    const res = computeExpectedAward(
      facts({
        attempts: Array.from({ length: 10 }, () => q({ isCorrect: true })),
        isFirstTestToday: true,
        daysSinceLastActive: 1,
        currentStreak: 6, // projected 6+1 = 7 -> multiplier active
        readinessLevel: 4,
      }),
    );
    // base = 10*4 + 10 (completed) + 5 (first today) = 55
    // streak bonus = 55 // 2 = 27 -> 82
    // quality: int(82 * 1.25) = int(102.5) = 102
    expect(res.projectedStreak).toBe(7);
    expect(res.isPracticeOnly).toBe(false);
    expect(res.totalEarned).toBe(102);
    expect(res.breakdown).toEqual([
      { label: "10 questions attempted", points: 40 },
      { label: "Test completed fully", points: 10 },
      { label: "First test today", points: 5 },
      { label: "7+ day streak (1.5x)", points: 27 },
      { label: "Readiness L4 (1.25x)", points: 20 },
    ]);
  });

  it("reattempt same week (anti-farming gate) -> 0 XP, is_practice_only", () => {
    const res = computeExpectedAward(
      facts({
        attempts: Array.from({ length: 10 }, () => q({ isCorrect: true })),
        alreadyAwardedThisWeek: true,
        isFirstTestToday: true,
      }),
    );
    expect(res.totalEarned).toBe(0);
    expect(res.isPracticeOnly).toBe(true);
    expect(res.breakdown).toEqual([
      { label: "Practice complete (XP already earned this week)", points: 0 },
    ]);
  });
});

describe("computeExpectedAward — per-question XP (:170-196)", () => {
  it("+4/+3/+2/0/-1 plus +1 curiosity", () => {
    const res = computeExpectedAward(
      facts({
        attempts: [
          q({ isCorrect: true }), // +4
          q({ isCorrect: true, hintsUsed: 2 }), // +3
          q({ persistedAfterWrong: true }), // +2
          q({ gaveUpAfterWrong: true }), // +0
          q(), // -1 (wrong, no review)
          q({ isCorrect: true, solutionViewedAfterCorrect: true }), // +4 +1 curiosity
        ],
        totalQuestions: 6,
      }),
    );
    // questions = 4+3+2+0-1+5 = 13; + completion 10 = 23; L3 multiplier 1.0 -> 23
    expect(res.totalEarned).toBe(23);
    expect(res.breakdown).toEqual([
      { label: "6 questions attempted", points: 13 },
      { label: "Test completed fully", points: 10 },
    ]);
  });

  it("curiosity bonus only applies to CORRECT answers", () => {
    const res = computeExpectedAward(
      facts({ attempts: [q({ solutionViewedAfterCorrect: true })], totalQuestions: 1 }),
    );
    // wrong -1, completion +10 -> 9 (no +1)
    expect(res.totalEarned).toBe(9);
  });
});

describe("computeExpectedAward — skips, completion, first-today, comeback", () => {
  it("skip penalty -2 each; no completion bonus when attempted < total", () => {
    const res = computeExpectedAward(
      facts({ attempts: Array.from({ length: 4 }, () => q({ isCorrect: true })), totalQuestions: 10 }),
    );
    // 16 - 12 = 4 (no completion: 4 < 10; no first-today; days 0 -> no comeback)
    expect(res.totalEarned).toBe(4);
    expect(res.breakdown).toEqual([
      { label: "4 questions attempted", points: 16 },
      { label: "6 questions skipped", points: -12 },
    ]);
  });

  it("comeback +10 at daysSinceLastActive >= 3, projected streak resets to 1", () => {
    const res = computeExpectedAward(
      facts({
        attempts: Array.from({ length: 10 }, () => q({ isCorrect: true })),
        daysSinceLastActive: 3,
      }),
    );
    // 40 + 10 + 10 = 60
    expect(res.totalEarned).toBe(60);
    expect(res.projectedStreak).toBe(1);
    expect(res.breakdown).toContainEqual({ label: "Comeback bonus", points: 10 });
  });

  it("never-active student (daysSinceLastActive null) gets no comeback", () => {
    const res = computeExpectedAward(
      facts({
        attempts: Array.from({ length: 10 }, () => q({ isCorrect: true })),
        daysSinceLastActive: null,
      }),
    );
    expect(res.totalEarned).toBe(50);
    expect(res.projectedStreak).toBe(1);
  });

  it("totalQuestions 0 -> no completion bonus (guard total_questions > 0)", () => {
    const res = computeExpectedAward(facts({ attempts: [], totalQuestions: 0 }));
    expect(res.totalEarned).toBe(0);
    expect(res.breakdown).toEqual([]);
  });
});

describe("computeExpectedAward — streak multiplier (:232-247)", () => {
  it("projected streak: active today keeps streak, yesterday increments, gap resets", () => {
    expect(computeExpectedAward(facts({ daysSinceLastActive: 0, currentStreak: 9 })).projectedStreak).toBe(9);
    expect(computeExpectedAward(facts({ daysSinceLastActive: 1, currentStreak: 9 })).projectedStreak).toBe(10);
    expect(computeExpectedAward(facts({ daysSinceLastActive: 5, currentStreak: 9 })).projectedStreak).toBe(1);
  });

  it("streak 6 -> no bonus; streak 7 via today -> floor(base/2)", () => {
    const base = {
      attempts: Array.from({ length: 10 }, () => q({ isCorrect: true })),
      daysSinceLastActive: 0,
    };
    expect(computeExpectedAward(facts({ ...base, currentStreak: 6 })).totalEarned).toBe(50);
    // base 50 -> bonus 50//2 = 25 -> 75
    const res = computeExpectedAward(facts({ ...base, currentStreak: 7 }));
    expect(res.totalEarned).toBe(75);
    expect(res.breakdown).toContainEqual({ label: "7+ day streak (1.5x)", points: 25 });
  });

  it("negative base + streak: bonus = base_points // 2 FLOORS toward -inf and is still added (no breakdown row)", () => {
    const res = computeExpectedAward(
      facts({
        attempts: Array.from({ length: 5 }, () => q()), // 5 wrong -> -5
        totalQuestions: 10, // 5 skipped -> -10 => base -15
        daysSinceLastActive: 1,
        currentStreak: 10, // projected 11 >= 7
      }),
    );
    // Python: -15 // 2 = -8 (floor division) -> total -23; transaction only when bonus > 0
    expect(res.totalEarned).toBe(-23);
    expect(res.breakdown.some((b) => b.label.includes("streak"))).toBe(false);
  });
});

describe("computeExpectedAward — quality multiplier (:251-270)", () => {
  it("L3 multiplier 1.0 -> no breakdown entry, total unchanged", () => {
    const res = computeExpectedAward(
      facts({ attempts: Array.from({ length: 10 }, () => q({ isCorrect: true })) }),
    );
    expect(res.totalEarned).toBe(50);
    expect(res.breakdown.some((b) => b.label.startsWith("Readiness"))).toBe(false);
  });

  it("L1 halves and truncates toward zero: int(-15 * 0.5) = int(-7.5) = -7 (NOT -8)", () => {
    const res = computeExpectedAward(
      facts({
        attempts: Array.from({ length: 5 }, () => q()), // -5
        totalQuestions: 10, // -10 => base -15
        readinessLevel: 1,
      }),
    );
    expect(res.totalEarned).toBe(-7);
    expect(res.breakdown).toContainEqual({ label: "Readiness L1 (0.50x)", points: 8 });
  });

  it("L5 1.5x with int() truncation on an odd base: int(55*1.5) = int(82.5) = 82", () => {
    const res = computeExpectedAward(
      facts({
        attempts: Array.from({ length: 10 }, () => q({ isCorrect: true })),
        isFirstTestToday: true, // base 40 + 10 + 5 = 55
        readinessLevel: 5,
      }),
    );
    // int(55 * 1.5) = int(82.5) = 82 (truncation toward zero), delta +27
    expect(res.totalEarned).toBe(82);
    expect(res.breakdown).toContainEqual({ label: "Readiness L5 (1.50x)", points: 27 });
  });

  it("unknown readiness level falls back to 1.0 (dict.get default)", () => {
    const res = computeExpectedAward(
      facts({ attempts: Array.from({ length: 10 }, () => q({ isCorrect: true })), readinessLevel: 99 }),
    );
    expect(res.totalEarned).toBe(50);
  });
});

describe("computeExpectedAward — review/focus penalties AFTER the multiplier, unscaled (:272-296)", () => {
  it("penalties are NOT scaled by the quality multiplier", () => {
    const res = computeExpectedAward(
      facts({
        attempts: Array.from({ length: 10 }, () => q({ isCorrect: true })),
        readinessLevel: 5, // base 50 -> int(50*1.5) = 75
        incorrectWithoutReview: 2, // -2 unscaled
        appSwitches: 1, // -2 unscaled
      }),
    );
    // 75 - 2 - 2 = 71. (Pre-multiplier penalties would give int(46*1.5) = 69.)
    expect(res.totalEarned).toBe(71);
    expect(res.breakdown).toContainEqual({ label: "2 wrong (no review)", points: -2 });
    expect(res.breakdown).toContainEqual({ label: "Lost focus (1x)", points: -2 });
  });

  it("app switches: first -2, each additional -3 (:291)", () => {
    const one = computeExpectedAward(facts({ appSwitches: 1 }));
    expect(one.breakdown).toContainEqual({ label: "Lost focus (1x)", points: -2 });
    const three = computeExpectedAward(facts({ appSwitches: 3 }));
    // -2 + 2 * -3 = -8
    expect(three.breakdown).toContainEqual({ label: "Lost focus (3x)", points: -8 });
  });

  it("full negative-session pipeline: per-session total CAN be negative (§9.11)", () => {
    const res = computeExpectedAward(
      facts({
        attempts: Array.from({ length: 5 }, () => q()), // -5
        totalQuestions: 10, // skipped 5 -> -10 => base -15
        daysSinceLastActive: null,
        readinessLevel: 1, // int(-7.5) = -7
        skippedWithoutReview: 3, // -3
        incorrectWithoutReview: 2, // -2
        appSwitches: 2, // -2 + 1*-3 = -5
      }),
    );
    expect(res.totalEarned).toBe(-17); // -7 - 3 - 2 - 5
    expect(res.breakdown).toEqual([
      { label: "5 questions attempted", points: -5 },
      { label: "5 questions skipped", points: -10 },
      { label: "Readiness L1 (0.50x)", points: 8 },
      { label: "3 skipped (no review)", points: -3 },
      { label: "2 wrong (no review)", points: -2 },
      { label: "Lost focus (2x)", points: -5 },
    ]);
  });
});

describe("level helpers (gamification_service.py:71-76 / xp_rules.dart:63-85)", () => {
  it("levelFor boundaries", () => {
    expect(levelFor(0)).toBe(0);
    expect(levelFor(49)).toBe(0);
    expect(levelFor(50)).toBe(1);
    expect(levelFor(199)).toBe(1);
    expect(levelFor(200)).toBe(2);
    expect(levelFor(499)).toBe(2);
    expect(levelFor(500)).toBe(3);
    expect(levelFor(999)).toBe(3);
    expect(levelFor(1000)).toBe(4);
    expect(levelFor(123456)).toBe(4);
  });

  it("levelName boundaries (§8.3.20)", () => {
    expect(levelName(49)).toBe("Explorer");
    expect(levelName(50)).toBe("Rising Star");
    expect(levelName(200)).toBe("Super Nova");
    expect(levelName(500)).toBe("Blazing Pro");
    expect(levelName(1000)).toBe("Galaxy Master");
  });

  it("nextLevelPoints / xpToNextLevel", () => {
    expect(nextLevelPoints(0)).toBe(50);
    expect(nextLevelPoints(999)).toBe(1000);
    expect(nextLevelPoints(1000)).toBeNull();
    expect(xpToNextLevel(49)).toBe(1);
    expect(xpToNextLevel(50)).toBe(150);
    expect(xpToNextLevel(5000)).toBeNull();
  });
});
