/**
 * §8.3 group 1 — calculateWeightedAccuracy
 * (metrics_service.py:730-757, DIFFICULTY_WEIGHTS :734).
 * Golden values produced by executing the Python source on identical fixtures
 * (2026-06-12).
 */
import { describe, expect, it } from "vitest";
import { calculateWeightedAccuracy, DIFFICULTY_WEIGHTS } from "../metrics";
import { att, seq } from "./helpers";

describe("DIFFICULTY_WEIGHTS", () => {
  it("matches metrics_service.py:734", () => {
    expect(DIFFICULTY_WEIGHTS).toEqual({ easy: 1.0, medium: 2.0, hard: 3.5, very_hard: 5.0 });
  });
});

describe("calculateWeightedAccuracy", () => {
  it("pinned §8.3.1 fixture: 4E correct, 3/4M correct, 1/2H correct -> 13.5/19 = 0.7105", () => {
    const attempts = [
      ...seq(4, () => ({ correct: true, diff: "easy" })),
      ...Array.from({ length: 4 }, (_, i) => att(4 + i, { correct: i < 3, diff: "medium" })),
      ...Array.from({ length: 2 }, (_, i) => att(8 + i, { correct: i < 1, diff: "hard" })),
    ];
    // w_correct = 4*1.0 + 3*2.0 + 1*3.5 = 13.5; w_total = 4*1.0 + 4*2.0 + 2*3.5 = 19
    expect(calculateWeightedAccuracy(attempts)).toBe(0.7105); // Python: 0.7105
  });

  it("unknown difficulty falls back to weight 2.0 (dict.get default)", () => {
    const attempts = [att(0, { correct: true, diff: "weird" }), att(1, { diff: "weird" })];
    expect(calculateWeightedAccuracy(attempts)).toBe(0.5); // Python: 0.5 (2.0/4.0)
  });

  it("empty attempts -> 0.0", () => {
    expect(calculateWeightedAccuracy([])).toBe(0.0); // Python: 0.0
  });

  it("only unanswered attempts -> 0.0", () => {
    expect(calculateWeightedAccuracy([att(0, { sel: null }), att(1, { sel: null })])).toBe(0.0);
  });

  it("perfect answered set -> 1.0", () => {
    expect(
      calculateWeightedAccuracy([
        att(0, { correct: true, diff: "easy" }),
        att(1, { correct: true, diff: "hard" }),
      ]),
    ).toBe(1.0);
  });

  it("ignores unanswered rows in both numerator and denominator", () => {
    const attempts = [
      att(0, { correct: true, diff: "hard" }),
      att(1, { sel: null, diff: "hard" }), // viewed only — excluded
    ];
    expect(calculateWeightedAccuracy(attempts)).toBe(1.0);
  });
});
