/**
 * §8.3 groups 10-14 — FAD, TCR, HSB, PEB, EWP
 * (metrics_service.py:387-458, :461-501, :504-557, :560-604, :607-647).
 * Every expected score/status/category below was produced by executing the
 * Python source on identical fixtures (2026-06-12).
 */
import { describe, expect, it } from "vitest";
import {
  calculateEwp,
  calculateFad,
  calculateHsb,
  calculatePeb,
  calculateTcr,
} from "../metrics";
import { att, seq } from "./helpers";

// ── m09 FAD (:387-458) ────────────────────────────────────────────────

/** 10 easy attempts: first 5 correct @10000ms, last 5: lateCorrect correct @lateT. */
const easy10 = (lateCorrect: number, lateT: number) => [
  ...seq(5, () => ({ correct: true, t: 10000, diff: "easy" })),
  ...Array.from({ length: 5 }, (_, i) =>
    att(5 + i, { correct: i < lateCorrect, t: lateT, diff: "easy" }),
  ),
];

describe("calculateFad", () => {
  it("< 6 attempts -> NEUTRAL insufficient_data", () => {
    expect(calculateFad(seq(5, () => ({ correct: true })))).toEqual({
      score: 0.0,
      status: "neutral",
      category: "insufficient_data",
    });
  });

  it("red drop 0.6, late faster (speed_ratio 0.6 < 0.7) -> disengagement", () => {
    expect(calculateFad(easy10(2, 6000))).toEqual({ score: 0.6, status: "red", category: "disengagement" });
  });

  it("red drop 0.6, late slower (speed_ratio 1.4 > 1.3) -> cognitive_fatigue", () => {
    expect(calculateFad(easy10(2, 14000))).toEqual({ score: 0.6, status: "red", category: "cognitive_fatigue" });
  });

  it("red drop 0.6, same speed (ratio 1.0) -> decline", () => {
    expect(calculateFad(easy10(2, 10000))).toEqual({ score: 0.6, status: "red", category: "decline" });
  });

  it("drop 0.2 on easy-only path -> yellow mild_decline (0.10 < drop <= 0.25)", () => {
    expect(calculateFad(easy10(4, 10000))).toEqual({ score: 0.2, status: "yellow", category: "mild_decline" });
  });

  it("no drop -> green sustained", () => {
    expect(calculateFad(easy10(5, 10000))).toEqual({ score: 0.0, status: "green", category: "sustained" });
  });

  it("improvement 0.4 > 0.30 -> yellow suspicious_improvement (score = improvement)", () => {
    const attempts = [
      ...seq(5, (i) => ({ correct: i < 1, t: 10000, diff: "easy" })),
      ...Array.from({ length: 5 }, (_, i) => att(5 + i, { correct: i < 3, t: 10000, diff: "easy" })),
    ];
    expect(calculateFad(attempts)).toEqual({ score: 0.4, status: "yellow", category: "suspicious_improvement" });
  });

  it("difficulty increase widens thresholds: drop 0.2 easy->hard is GREEN on the all-Q path", () => {
    // early all-easy, late all-hard => late_easy empty -> all-question path;
    // late_diff 3 > early_diff 1 + 0.5 -> green_threshold 0.20 (+0.05 all-Q) = 0.25 > drop 0.2
    const attempts = [
      ...seq(5, () => ({ correct: true, t: 8000, diff: "easy" })),
      ...Array.from({ length: 5 }, (_, i) => att(5 + i, { correct: i < 4, t: 20000, diff: "hard" })),
    ];
    expect(calculateFad(attempts)).toEqual({ score: 0.2, status: "green" });
  });

  it("same drop 0.2 WITHOUT difficulty increase is YELLOW on the all-Q path (0.15 < drop <= 0.30)", () => {
    const attempts = [
      ...seq(5, () => ({ correct: true, t: 8000, diff: "medium" })),
      ...Array.from({ length: 5 }, (_, i) => att(5 + i, { correct: i < 4, t: 8000, diff: "medium" })),
    ];
    expect(calculateFad(attempts)).toEqual({ score: 0.2, status: "yellow" });
  });

  it("all-Q path red has NO speed category (drop 1.0)", () => {
    const attempts = [
      ...seq(5, () => ({ correct: true, t: 8000, diff: "easy" })),
      ...Array.from({ length: 5 }, (_, i) => att(5 + i, { correct: false, t: 20000, diff: "hard" })),
    ];
    expect(calculateFad(attempts)).toEqual({ score: 1.0, status: "red" });
  });

  it("easy-only normalization: drop measured on EASY questions only, not all questions", () => {
    // Mixed halves. early_easy (idx 0,1,2) all correct -> 1.0;
    // late_easy (idx 5 correct, idx 6 wrong) -> 0.5; drop 0.5 -> red.
    // All-question accs would be early 0.6 -> late 0.8 (an improvement!).
    const attempts = [
      att(0, { correct: true, t: 10000, diff: "easy" }),
      att(1, { correct: true, t: 10000, diff: "easy" }),
      att(2, { correct: true, t: 10000, diff: "easy" }),
      att(3, { correct: false, t: 10000 }),
      att(4, { correct: false, t: 10000 }),
      att(5, { correct: true, t: 10000, diff: "easy" }),
      att(6, { correct: false, t: 10000, diff: "easy" }),
      att(7, { correct: true, t: 10000 }),
      att(8, { correct: true, t: 10000 }),
      att(9, { correct: true, t: 10000 }),
    ];
    expect(calculateFad(attempts)).toEqual({ score: 0.5, status: "red", category: "decline" });
  });
});

// ── m10 TCR (:461-501) ────────────────────────────────────────────────

describe("calculateTcr", () => {
  it("< 3 attempts -> yellow score 0", () => {
    expect(calculateTcr([att(0, { t: 5000 }), att(1, { t: 9000 })])).toEqual({ score: 0.0, status: "yellow" });
  });

  it("low CV within each difficulty group -> green (cross-difficulty speed differences are fine)", () => {
    const attempts = [
      att(0, { t: 10000, diff: "easy" }),
      att(1, { t: 10000, diff: "easy" }),
      att(2, { t: 3000 }),
      att(3, { t: 3100 }),
      att(4, { t: 2900 }),
    ];
    // medium group CV = std([3000,3100,2900])/3000 = 81.65/3000 = 0.0272
    expect(calculateTcr(attempts)).toEqual({ score: 0.0272, status: "green" });
  });

  it("CV exactly 0.5 -> yellow (green band is STRICT < 0.50)", () => {
    const attempts = [att(0, { t: 5000 }), att(1, { t: 15000 }), att(2, { t: 8000, diff: "easy" })];
    // medium group: mean 10000, std 5000 -> CV 0.5 (single-member easy group skipped)
    expect(calculateTcr(attempts)).toEqual({ score: 0.5, status: "yellow" });
  });

  it("CV 0.9 -> red, dumpDetected false", () => {
    const attempts = [att(0, { t: 1000 }), att(1, { t: 19000 }), att(2, { t: 8000, diff: "easy" })];
    expect(calculateTcr(attempts)).toEqual({ score: 0.9, status: "red", dumpDetected: false });
  });

  it("dump pattern (last-3 avg < 0.30 x first-3 avg) -> red even with per-group CV 0", () => {
    const attempts = [
      ...seq(3, () => ({ t: 10000, diff: "easy" })),
      ...Array.from({ length: 3 }, (_, i) => att(3 + i, { t: 2000 })),
    ];
    // f3 = 10000, l3 = 2000 < 3000 -> dump
    expect(calculateTcr(attempts)).toEqual({ score: 0.0, status: "red", dumpDetected: true });
  });
});

// ── m11 HSB (:504-557) ────────────────────────────────────────────────

describe("calculateHsb", () => {
  // strategic = hint on medium/hard AND wrong; unnecessary = hint on easy;
  // missed = medium/hard wrong, no hint, not persisted/gave-up (or unanswered).
  const strategic = (i: number) => att(i, { correct: false, hints: 1 }); // medium wrong + hint
  const unnecessary = (i: number) => att(i, { correct: true, hints: 1, diff: "easy" });
  const missedAnswered = (i: number) => att(i, { correct: false, diff: "hard" });

  it("2 strategic + 1 unnecessary + 1 missed -> 0.5 yellow mixed", () => {
    expect(calculateHsb([strategic(0), strategic(1), unnecessary(2), missedAnswered(3)])).toEqual({
      score: 0.5,
      status: "yellow",
      category: "mixed",
    });
  });

  it("3 strategic + 1 unnecessary -> 0.75 green strategic", () => {
    expect(calculateHsb([strategic(0), strategic(1), strategic(2), unnecessary(3)])).toEqual({
      score: 0.75,
      status: "green",
      category: "strategic",
    });
  });

  it("1 strategic + 4 unnecessary -> 0.2 red unfocused", () => {
    expect(
      calculateHsb([strategic(0), unnecessary(1), unnecessary(2), unnecessary(3), unnecessary(4)]),
    ).toEqual({ score: 0.2, status: "red", category: "unfocused" });
  });

  it("gave-up on medium/hard wrong is NOT 'missed' (choosing the solution = help-seeking)", () => {
    // denom = 1 (the unnecessary hint), NOT 2 — gave-up exempted
    expect(calculateHsb([unnecessary(0), att(1, { correct: false, gave: true })])).toEqual({
      score: 0.0,
      status: "red",
      category: "unfocused",
    });
  });

  it("unanswered medium/hard counts as missed", () => {
    expect(calculateHsb([strategic(0), att(1, { sel: null, correct: false })])).toEqual({
      score: 0.5,
      status: "yellow",
      category: "mixed",
    });
  });

  it("persisted-after-wrong is NOT missed", () => {
    expect(calculateHsb([strategic(0), att(1, { correct: false, pers: true })])).toEqual({
      score: 1.0,
      status: "green",
      category: "strategic",
    });
  });

  it("denom 0 @ acc 0.8 -> green no_help_needed", () => {
    expect(calculateHsb([att(0, { correct: true })], 0.8)).toEqual({
      score: 1.0,
      status: "green",
      category: "no_help_needed",
    });
  });

  it("denom 0 @ acc 0.6 -> yellow uncertain (0.5)", () => {
    expect(calculateHsb([att(0, { correct: true })], 0.6)).toEqual({
      score: 0.5,
      status: "yellow",
      category: "uncertain",
    });
  });

  it("denom 0 @ acc 0.3 -> yellow should_have_sought_help (0.0)", () => {
    expect(calculateHsb([att(0, { correct: true })], 0.3)).toEqual({
      score: 0.0,
      status: "yellow",
      category: "should_have_sought_help",
    });
  });
});

// ── m12 PEB (:560-604) ────────────────────────────────────────────────

describe("calculatePeb", () => {
  // avg over answered times [10000, 9000, 10000, 10000, 2000] = 8200;
  // error@0 -> next 9000 normal (resilient); error@2 -> next unanswered (cascade skip);
  // error@4 -> next 2000 < 0.3*8200=2460 (rush). rate = 1/3 = 0.3333 red.
  const mixed = [
    att(0, { correct: false, t: 10000 }),
    att(1, { correct: true, t: 9000 }),
    att(2, { correct: false, t: 10000 }),
    att(3, { sel: null }),
    att(4, { correct: false, t: 10000 }),
    att(5, { correct: true, t: 2000 }),
  ];

  it("cascade-skip and rush after error are not resilient -> 1/3 red", () => {
    expect(calculatePeb(mixed)).toEqual({ score: 0.3333, status: "red" });
  });

  it("sorts by createdAt before scanning (scrambled input gives the same result)", () => {
    const scrambled = [mixed[3], mixed[5], mixed[0], mixed[4], mixed[2], mixed[1]];
    expect(calculatePeb(scrambled)).toEqual({ score: 0.3333, status: "red" });
  });

  it("slow next question (> 2.5x avg): resilient only when it is medium/hard -> 1/2 yellow", () => {
    // avg = (4000+30000+4000+30000+4000*4)/8 = 10500; 2.5*avg = 26250
    const attempts = [
      att(0, { correct: false, t: 4000 }),
      att(1, { correct: true, t: 30000 }), // slow but medium -> resilient
      att(2, { correct: false, t: 4000 }),
      att(3, { correct: true, t: 30000, diff: "easy" }), // slow on EASY -> freeze
      ...Array.from({ length: 4 }, (_, i) => att(4 + i, { correct: true, t: 4000 })),
    ];
    expect(calculatePeb(attempts)).toEqual({ score: 0.5, status: "yellow" });
  });

  it("no errors -> green 1.0", () => {
    expect(calculatePeb(seq(4, () => ({ correct: true, t: 5000 })))).toEqual({ score: 1.0, status: "green" });
  });

  it("< 2 attempts -> yellow 1.0", () => {
    expect(calculatePeb([att(0, { correct: true, t: 5000 })])).toEqual({ score: 1.0, status: "yellow" });
  });

  it(">= 2 attempts but none answered -> red 0", () => {
    expect(calculatePeb(seq(3, () => ({ sel: null })))).toEqual({ score: 0, status: "red" });
  });
});

// ── m13 EWP (:607-647) ────────────────────────────────────────────────

describe("calculateEwp", () => {
  // 9 attempts -> third = max(2, 9//3) = 3: early = first 3, late = last 3.
  const nine = (earlyT: number, lateT: number, lateCorrect: number) => [
    ...seq(3, () => ({ correct: true, t: earlyT })),
    ...Array.from({ length: 3 }, (_, i) => att(3 + i, { correct: true, t: Math.floor((earlyT + lateT) / 2) })),
    ...Array.from({ length: 3 }, (_, i) => att(6 + i, { correct: i < lateCorrect, t: lateT })),
  ];

  it("ratio 0.8 > 0.70 -> green (no category)", () => {
    expect(calculateEwp(nine(10000, 8000, 3))).toEqual({ score: 0.8, status: "green" });
  });

  it("ratio 0.4 but late accuracy holds (>= 0.85 x early) -> green efficient", () => {
    expect(calculateEwp(nine(10000, 4000, 3))).toEqual({ score: 0.4, status: "green", category: "efficient" });
  });

  it("ratio 0.5 with accuracy drop -> yellow declining", () => {
    expect(calculateEwp(nine(10000, 5000, 1))).toEqual({ score: 0.5, status: "yellow", category: "declining" });
  });

  it("ratio 0.3 with accuracy drop -> red withdrawal", () => {
    expect(calculateEwp(nine(10000, 3000, 0))).toEqual({ score: 0.3, status: "red", category: "withdrawal" });
  });

  it("effort = time + 2000*changes + 3000*hints (early effort 1000+6000+3000=10000, late 2500 -> 0.25 red)", () => {
    const attempts = [
      ...seq(3, () => ({ correct: true, t: 1000, changes: 3, hints: 1 })),
      ...Array.from({ length: 3 }, (_, i) => att(3 + i, { correct: true, t: 5000 })),
      ...Array.from({ length: 3 }, (_, i) => att(6 + i, { correct: false, t: 2500 })),
    ];
    expect(calculateEwp(attempts)).toEqual({ score: 0.25, status: "red", category: "withdrawal" });
  });

  it("early effort 0 -> red 0 (division guard)", () => {
    expect(calculateEwp(seq(6, () => ({ t: 0 })))).toEqual({ score: 0, status: "red" });
  });

  it("< 6 attempts -> yellow 1.0", () => {
    expect(calculateEwp(seq(5, () => ({ t: 5000 })))).toEqual({ score: 1.0, status: "yellow" });
  });
});
