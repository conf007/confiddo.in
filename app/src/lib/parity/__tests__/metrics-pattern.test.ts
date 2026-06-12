/**
 * §8.3 groups 15-17 — GEP, DAP, calculateStudentTheta
 * (metrics_service.py:689-727, :650-686, :765-791).
 * Every expected score/status/category below was produced by executing the
 * Python source on identical fixtures (2026-06-12).
 */
import { describe, expect, it } from "vitest";
import { calculateDap, calculateGep, calculateStudentTheta } from "../metrics";
import { att, seq } from "./helpers";

// ── m14 GEP (:689-727) ────────────────────────────────────────────────

describe("calculateGep", () => {
  it("< 4 answered -> NEUTRAL insufficient_data", () => {
    expect(calculateGep(seq(3, () => ({ correct: true, diff: "easy" })))).toEqual({
      score: 1.0,
      status: "neutral",
      category: "insufficient_data",
    });
  });

  it("single difficulty -> 0 cross pairs -> NEUTRAL no_difficulty_pairs", () => {
    expect(calculateGep(seq(4, (i) => ({ correct: i % 2 === 0 })))).toEqual({
      score: 1.0,
      status: "neutral",
      category: "no_difficulty_pairs",
    });
  });

  it("easier correct, harder wrong is NOT a Guttman error -> 1.0 green consistent", () => {
    const attempts = [
      att(0, { correct: true, diff: "easy" }),
      att(1, { correct: true, diff: "easy" }),
      att(2, { correct: false }),
      att(3, { correct: false }),
    ];
    expect(calculateGep(attempts)).toEqual({ score: 1.0, status: "green", category: "consistent" });
  });

  it("harder correct + easier wrong: 2 errors of 4 pairs -> 0.5 red inconsistent", () => {
    const attempts = [
      att(0, { correct: false, diff: "easy" }),
      att(1, { correct: true, diff: "easy" }),
      att(2, { correct: true }),
      att(3, { correct: true }),
    ];
    expect(calculateGep(attempts)).toEqual({ score: 0.5, status: "red", category: "inconsistent" });
  });

  it("consistency exactly 0.85 -> yellow mixed (green band is STRICT > 0.85)", () => {
    // 4 easy (1 wrong) x 5 medium (3 correct): 20 pairs, 1*3 = 3 errors -> 1 - 0.15 = 0.85
    const attempts = [
      ...seq(4, (i) => ({ correct: i > 0, diff: "easy" })),
      ...Array.from({ length: 5 }, (_, i) => att(4 + i, { correct: i < 3 })),
    ];
    expect(calculateGep(attempts)).toEqual({ score: 0.85, status: "yellow", category: "mixed" });
  });

  it("1 error of 4 pairs -> 0.75 yellow mixed", () => {
    const attempts = [
      ...seq(4, (i) => ({ correct: i > 0, diff: "easy" })),
      att(4, { correct: true }),
    ];
    expect(calculateGep(attempts)).toEqual({ score: 0.75, status: "yellow", category: "mixed" });
  });

  it("unknown difficulty ranks as 2 (dict.get default) -> pairs against easy", () => {
    const attempts = [
      att(0, { correct: false, diff: "easy" }),
      att(1, { correct: false, diff: "easy" }),
      att(2, { correct: true, diff: "weird" }),
      att(3, { correct: true, diff: "weird" }),
    ];
    expect(calculateGep(attempts)).toEqual({ score: 0.0, status: "red", category: "inconsistent" });
  });
});

// ── m15 DAP (:650-686) — "hard" bucket = medium + hard ───────────────

describe("calculateDap", () => {
  /** easyN easy@easyT correct + nHard medium@hardT with nCorrect correct. */
  const dap = (easyT: number, hardT: number, nHard: number, nCorrect: number, easyN = 2) => [
    ...seq(easyN, () => ({ correct: true, t: easyT, diff: "easy" })),
    ...Array.from({ length: nHard }, (_, i) => att(easyN + i, { correct: i < nCorrect, t: hardT })),
  ];

  it("ratio 1.2 @ hard_acc 0.70 -> green high_ability (boundary >= 0.70)", () => {
    expect(calculateDap(dap(10000, 12000, 10, 7))).toEqual({ score: 1.2, status: "green", category: "high_ability" });
    expect(calculateDap(dap(10000, 12000, 100, 70))).toEqual({ score: 1.2, status: "green", category: "high_ability" });
  });

  it("ratio 1.2 @ hard_acc 0.69 -> yellow flat_struggling", () => {
    expect(calculateDap(dap(10000, 12000, 100, 69))).toEqual({ score: 1.2, status: "yellow", category: "flat_struggling" });
  });

  it("ratio 0.9 @ hard_acc 0.70 -> yellow unusual_but_accurate", () => {
    expect(calculateDap(dap(10000, 9000, 100, 70))).toEqual({ score: 0.9, status: "yellow", category: "unusual_but_accurate" });
  });

  it("ratio 0.9 @ hard_acc 0.69 -> red confused", () => {
    expect(calculateDap(dap(10000, 9000, 100, 69))).toEqual({ score: 0.9, status: "red", category: "confused" });
  });

  it("ratio exactly 1.0 leaves the inverted band (boundary < 1.0) -> high_ability at acc 0.7", () => {
    expect(calculateDap(dap(10000, 10000, 10, 7))).toEqual({ score: 1.0, status: "green", category: "high_ability" });
  });

  it("ratio exactly 1.3 enters the appropriate band (1.3 <= ratio <= 3.0)", () => {
    expect(calculateDap(dap(10000, 13000, 10, 2))).toEqual({ score: 1.3, status: "green", category: "appropriate" });
  });

  it("ratio exactly 3.0 still appropriate", () => {
    expect(calculateDap(dap(10000, 30000, 10, 2))).toEqual({ score: 3.0, status: "green", category: "appropriate" });
  });

  it("ratio 3.5 -> yellow excessive", () => {
    expect(calculateDap(dap(10000, 35000, 10, 2))).toEqual({ score: 3.5, status: "yellow", category: "excessive" });
  });

  it("ratio exactly 5.0 still excessive (red is STRICT > 5.0)", () => {
    expect(calculateDap(dap(10000, 50000, 10, 2))).toEqual({ score: 5.0, status: "yellow", category: "excessive" });
  });

  it("ratio 5.5 -> red freezing_on_hard", () => {
    expect(calculateDap(dap(10000, 55000, 10, 2))).toEqual({ score: 5.5, status: "red", category: "freezing_on_hard" });
  });

  it("missing easy bucket -> yellow insufficient_data 1.0", () => {
    expect(calculateDap(seq(4, () => ({ correct: true, t: 5000 })))).toEqual({
      score: 1.0,
      status: "yellow",
      category: "insufficient_data",
    });
  });

  it("missing medium/hard bucket -> yellow insufficient_data 1.0", () => {
    expect(calculateDap(seq(4, () => ({ correct: true, t: 5000, diff: "easy" })))).toEqual({
      score: 1.0,
      status: "yellow",
      category: "insufficient_data",
    });
  });

  it("easy avg time 0 -> yellow score 0 (division guard, no category)", () => {
    expect(calculateDap(dap(0, 9000, 4, 2))).toEqual({ score: 0, status: "yellow" });
  });
});

// ── calculateStudentTheta (:765-791) ─────────────────────────────────

describe("calculateStudentTheta", () => {
  it("golden sequence (k=0.4, static thetas) -> 0.837", () => {
    const diffs = ["easy", "easy", "medium", "medium", "hard", "hard", "easy", "medium", "hard", "very_hard"];
    const correct = [true, true, true, false, true, false, true, true, false, true];
    const attempts = diffs.map((d, i) => att(i, { diff: d, correct: correct[i] }));
    expect(calculateStudentTheta(attempts)).toBe(0.837); // Python: 0.837
  });

  it("short golden sequence -> 0.204", () => {
    const attempts = [
      att(0, { correct: true, diff: "easy" }),
      att(1, { correct: true, diff: "medium" }),
      att(2, { correct: false, diff: "hard" }),
    ];
    expect(calculateStudentTheta(attempts)).toBe(0.204); // Python: 0.204
  });

  it("clamps at +3.0 (60 very_hard correct)", () => {
    expect(calculateStudentTheta(seq(60, () => ({ correct: true, diff: "very_hard" })))).toBe(3.0);
  });

  it("clamps at -3.0 (60 easy wrong)", () => {
    expect(calculateStudentTheta(seq(60, () => ({ correct: false, diff: "easy" })))).toBe(-3.0);
  });

  it("no answered attempts -> 0.0", () => {
    expect(calculateStudentTheta([])).toBe(0.0);
    expect(calculateStudentTheta([att(0, { sel: null })])).toBe(0.0);
  });
});
